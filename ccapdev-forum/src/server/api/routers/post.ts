import { clerkClient } from "@clerk/nextjs/server";
import { boolean, z } from "zod";
import type { User } from "@clerk/nextjs/dist/api";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import type { Post } from "@prisma/client";
import { Input } from "postcss";



const addUsersDataToPosts = async (posts: Post[]) =>{
  const users = (
    await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit: 100,
    })
  ).map(filterUserForClient);

  return posts.map(post =>{
    const author = users.find((user) => user.id === post.authorId);
    if(!author) throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR", 
      message: "Author for post not found",
    });
    return {
      post,
      author:{
        ...author,
        username: author.username,
      },
    };
  });
};

// Create a new ratelimiter, that allows 3 requests per 1 min
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */ 
  prefix: "@upstash/ratelimit",
});

export const postsRouter = createTRPCRouter({

  getById: publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id },
      include: {
        votes: true, // Include the "votes" relation field
      },
    });
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    const postUpvotesCount = post.votes.filter((vote) => vote.vote === true).length ?? 0;
    const postDownvotesCount = post.votes.filter((vote) => vote.vote === false).length ?? 0;
    const users = (
      await clerkClient.users.getUserList({
        userId: [post.authorId], // Changed from `posts.map((post) => post.authorId)`
        limit: 100,
      })
    ).map(filterUserForClient);
  
    const author = users.find((user) => user.id === post.authorId);
    if (!author) throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Author for post not found",
    });

    return {
      post,
      author: {
        ...author,
        username: author.username,
      },
      postUpvotesCount,
      postDownvotesCount,
    };
  }),


    

  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
      include: {
        votes: true, // Include the "votes" relation field
      },
    });
    const users = (
      await clerkClient.users.getUserList({
        userId: posts.map((post) => post.authorId),
        limit: 100,
      })
    ).map(filterUserForClient);
    return posts.map(post =>{
      const postUpvotesCount = post.votes.filter((vote) => vote.vote === true).length ?? 0;
      const postDownvotesCount = post.votes.filter((vote) => vote.vote === false).length ?? 0;
      const author = users.find((user) => user.id === post.authorId);
      if(!author) throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR", 
        message: "Author for post not found",
      });
      return {
        post,
        author:{
          ...author,
          username: author.username,
        },
        postUpvotesCount,
        postDownvotesCount,
      };
    });
  }),
  


  getPostByUserId: publicProcedure
  .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.prisma.post.findMany({
        where: {
          authorId: input.id,
        },
        take: 100,
        orderBy: [{ createdAt: "desc" }],
        include: {
          votes: true, // Include the "votes" relation field
        },
      });
      const authorIds = posts.map((post) => post.authorId);
      const authors = await clerkClient.users.getUserList({
        userId: authorIds,
        limit: 100,
      });
      const postData = posts.map((post) =>{
      const author = authors.map(filterUserForClient).find((user) => user.id === post.authorId);
        if (!author) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Author for comment not found",
          });
        }
        const postUpvotesCount = post?.votes.filter((vote) => vote.vote === true).length ?? 0;
        const postDownvotesCount = post?.votes.filter((vote) => vote.vote === false).length ?? 0;
        return {
          post,
          author: {
            ...author,
            username: author.username,
          },
          postUpvotesCount,
          postDownvotesCount,
        };
      });
      return postData;
    }),


  create: privateProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(255),
      })
  ).mutation(async ({ ctx, input}) =>{
    const authorId= ctx.userId;
    const { success } = await ratelimit.limit(authorId);
    if(!success) throw new TRPCError({code: "TOO_MANY_REQUESTS"});
    const post = await ctx.prisma.post.create({
      data: {
        authorId,
        title: input.title,
        content: input.content,
      },
    });
    return post;
  }),




  update: privateProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(255),
      })
    ).mutation(async ({ctx, input}) =>{
      const authorId = ctx.userId;
      const { success } = await ratelimit.limit(authorId);
    if(!success) throw new TRPCError({code: "TOO_MANY_REQUESTS"});
    const post = await ctx.prisma.post.update({
      where:{
        id: input.id,
      },
      data: { 
        title: input.title, 
        content: input.content,
      },
    });
    return post;
    }),


    search: publicProcedure
    .input(z.object({ searchString: z.string() }))
    .query(async ({ ctx, input }) => {
      const searchPost = await ctx.prisma.post.findMany({
        where: {
          title:{
            search: input.searchString,
          },
          content:{
            search: input.searchString,
          },
        },
        include:{
          votes: true,
        },
      });
      const authorIds = searchPost.map((post) => post.authorId);
      const authors = await clerkClient.users.getUserList({
        userId: authorIds,
        limit: 100,
      });
      const postData = searchPost.map((post) =>{
      const author = authors.map(filterUserForClient).find((user) => user.id === post.authorId);
        if (!author) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Author for comment not found",
          });
        }
        const postUpvotesCount = post?.votes.filter((vote) => vote.vote === true).length ?? 0;
        const postDownvotesCount = post?.votes.filter((vote) => vote.vote === false).length ?? 0;
        return {
          post,
          author: {
            ...author,
            username: author.username,
          },
          postUpvotesCount,
          postDownvotesCount,
        };
      });
        return postData;  
    }),
  
  updatePostVote: privateProcedure
  .input(
    z.object({
      postId: z.string(),
      vote: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const authorId = ctx.userId;
    const voteId = await ctx.prisma.vote.findFirst({
      where: {
        authorId,
        postId: input.postId,
      }
    })
    if(voteId !==null){
      const updatedVote = await ctx.prisma.vote.update({
        where: {
          id: voteId.id,
        },
        data: {
          vote: input.vote,
        },
      });
      return updatedVote;
    }
    if(voteId=== null){
      const updatedVote = await ctx.prisma.vote.create({
        data: {
          authorId,
          vote: input.vote,
          postId: input.postId,
        },
      });
      return updatedVote
    }
  }),



  delete: privateProcedure
  .input(
    z.object({
      postId: z.string(),
    })
  ).mutation(async({ctx, input}) =>{
    const authorId = ctx.userId;
      const { success } = await ratelimit.limit(authorId);
    if(!success) throw new TRPCError({code: "TOO_MANY_REQUESTS"});
    const post = await ctx.prisma.post.delete({
      where:{
        id: input.postId,
      },
    });
    return post;
  }),
});
