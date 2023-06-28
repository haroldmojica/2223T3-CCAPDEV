import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";

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

export const profileRouter = createTRPCRouter({
    getUserByUsername: publicProcedure
    .input(z.object({username: z.string()}))
    .query( async ({ input}) =>{
        const [user] = await clerkClient.users.getUserList({
            username: [input.username],
        });
        if(!user){
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "User not found",
            });
        }
        return filterUserForClient(user);
    }),
    getDescription: publicProcedure
    .input(z.object({id: z.string()}))
    .query(async({ctx,input}) => {
      const profile = await ctx.prisma.profile.findUnique({
        where:{id: input.id}
      });
      return profile;
      }),
    
    createDescription: privateProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).max(255),
      })
    ).mutation(async ({ ctx, input}) =>{
    const authorId= ctx.userId;
    const { success } = await ratelimit.limit(authorId);
    if(!success) throw new TRPCError({code: "TOO_MANY_REQUESTS"});
    const post = await ctx.prisma.profile.upsert({
      where: {
        id: input.id,
      },
      create: {
        id: input.id,
        description: input.description,
      },
      update: {
        id: input.id,
        description: input.description,
      },
    });
    return post;
  }),

});
