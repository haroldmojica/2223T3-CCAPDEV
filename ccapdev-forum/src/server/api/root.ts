import { createTRPCRouter } from "~/server/api/trpc";
import { postsRouter } from "./routers/post";
import { commentsRouter } from "./routers/comment";
import { profileRouter } from "./routers/profile";
import { voteRouter } from "./routers/vote";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  posts: postsRouter,
  comments: commentsRouter,
  profile: profileRouter,
  votes: voteRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
