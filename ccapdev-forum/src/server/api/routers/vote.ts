
import {z } from "zod";
import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

export const voteRouter = createTRPCRouter({

  getAll: publicProcedure
  .query(async ({ctx, input})=>{
    const vote = await ctx.prisma.vote.findMany({
    })
    return vote;
  }),
    findPostVote: publicProcedure
      .input(z.object({postId: z.string()}))
      .query(async ({ctx, input}) =>{
      
      const VotePost = await ctx.prisma.vote.findFirst({
        where: {
          postId: input.postId,
        },
      })
      return VotePost;
  }),
  findCommentPost: privateProcedure
      .input(z.object({commentId: z.string()}))
      .query(async ({ctx, input}) =>{
      const authorId = ctx.userId;
      
      const VotePost = await ctx.prisma.vote.findFirst({
        where: {
          commentId: input.commentId,
          authorId,
        },
      })
      return VotePost;
  }),
});