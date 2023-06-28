import {useUser } from "@clerk/nextjs";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { SubCommentView } from "~/components/subcommentview";
import { PostView } from "~/components/postview";
import { MainCommentView } from "~/components/maincommentview";
import { NavBar } from "~/components/navbar";


const MainCommentFeed = () => {
  const router = useRouter();
  const { data: commentData, isLoading: CommentsLoading } = api.comments.getSingleCommentById.useQuery({commentId: router.query.id as string});

  if(CommentsLoading) return <LoadingPage/>;
  if(!commentData) return <div>Something went wrong</div>;

  return (
    <div className ="flex flex-col">
      {commentData?.map((fullPost) => (
        <MainCommentView {...fullPost} key={fullPost.comment.id}/>
      ))}
    </div>
  );
};

const CommentFeed = () => {
  const router = useRouter();
  const { data: commentData, isLoading: CommentsLoading } = api.comments.getCommentByParentCommentId.useQuery({parentCommentId: router.query.id as string});

  if(CommentsLoading) return <LoadingPage/>;
  if(!commentData) return <div>Something went wrong</div>;

  return (
    <div className ="flex flex-col">
      {commentData?.map((fullPost) => (
        <SubCommentView {...fullPost} key={fullPost.comment.id}/>
      ))}
    </div>
  );
};

const CreatePostWizard = (props: {postId: string}) => {
  const { user } = useUser();
  const [content, setContent] = useState("");
  const ctx = api.useContext();
  const router = useRouter();
  const id = router.query.id as string; 
  const { mutate, isLoading: isPosting } = api.comments.subCommentCreate.useMutation({
    onSuccess: () => {
      setContent("");
      void ctx.comments.getCommentByParentCommentId.invalidate();
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
                mutate({ postId:props.postId, content, authorId: user.id, parentCommentId: id }); // Pass the postId from the router query
              }
            }
          }}
          disabled={isPosting}
        />
        {content !== "" && !isPosting && (
          <button onClick={() => mutate({ postId: props.postId, content, authorId: user.id, parentCommentId: id   })}>
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

const SingleCommentPage: NextPage<{id: string}> = ({id}) => {
  const {data} = api.comments.getById.useQuery({
    id,
  });
  const postId = data?.postId;
  if(!postId) return <div/>
  const {data: postData} = api.posts.getById.useQuery({
    id: postId,
  }); 
  
  if(!data) return <div>404</div>
  if(!postData) return <div>404</div>
  return (
    <>
      <Head>
        <title>{`${data.content ?? ""}`}</title>
      </Head>
        <NavBar/>
        <PageLayout>
          <PostView {...postData}/>
          <MainCommentFeed />
          <CommentFeed />
          <CreatePostWizard postId={postId} />
        </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) =>{
  const ssg = generateSSGHelper();

  const id = context.params?.id;
  if(typeof id !== "string") throw new Error ("no id");
  await ssg.comments.getById.prefetch({id});

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

export default SingleCommentPage;