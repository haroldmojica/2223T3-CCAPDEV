import {useUser } from "@clerk/nextjs";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import {  api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { PostCommentView } from "~/components/postcommentview";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { NavBar } from "~/components/navbar";



const CommentFeed = () => {
  const router = useRouter();
  const { data: commentData, isLoading: CommentsLoading } = api.comments.getCommentByPostId.useQuery({postId: router.query.id as string});

  if(CommentsLoading) return <LoadingPage/>;
  if(!commentData) return <div>Something went wrong</div>;

  return (
    <div className ="flex flex-col">
      {commentData?.map((fullPost) => (
        <PostCommentView {...fullPost} key={fullPost.comment.id}/>
      ))}
    </div>
  );
};

const CreatePostWizard = () => {
  const { user } = useUser();
  const [content, setContent] = useState("");
  const ctx = api.useContext();
  const router = useRouter();
  const id = router.query.id as string; 
  const { mutate, isLoading: isPosting } = api.comments.create.useMutation({
    onSuccess: () => {
      setContent("");
      void ctx.comments.getCommentByPostId.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post!");
      }
    },
  });

  if (!user) return null;
  return (
    <div className="border-b border-slate-400 p-8 flex">
      <div className="flex w-full gap-3">
        <input
          placeholder="Comment"
          className="bg-transparent grow outline-none"
          type="text"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (content !== "") {
                mutate({ postId: id, content, authorId: user.id }); // Pass the postId from the router query
              }
            }
          }}
          disabled={isPosting}
        />
        {content !== "" && !isPosting && (
          <button onClick={() => mutate({ postId: id, content, authorId: user.id  })}>
            Post
          </button>
        )}
        {isPosting && (
          <div className="flex justify-center item-center">
            <LoadingSpinner size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

const SinglePostPage: NextPage<{id: string}> = ({id}) => {
  const {data} = api.posts.getById.useQuery({
    id,
  });
  if(!data) return <div>404</div>
  return (
    <>
      <Head>
        <title>{`${data.post.content ?? ""} - ${data.author.username ?? ""}`}</title>
      </Head>
        <NavBar/>
        <PageLayout>
          <PostView {...data}/>
          <CommentFeed />
          <CreatePostWizard  />
        </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) =>{
  const ssg = generateSSGHelper();

  const id = context.params?.id;
  if(typeof id !== "string") throw new Error ("no id");
  await ssg.posts.getById.prefetch({id});

  return {
    props:{
      trpcState: ssg.dehydrate(),
      id,
    },
  };
};

export const getStaticPaths = () =>{
  return{paths: [], fallback: "blocking"};
};

export default SinglePostPage;