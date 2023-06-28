import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useRouter } from "next/router";

import { PostView } from "~/components/postview";
import { CommentView } from "~/components/commentview";
import { NavBar } from "~/components/navbar";



const CommentFeed = () => {
  const router = useRouter();
  const { data: commentData, isLoading: CommentsLoading } = api.comments.search.useQuery({searchString: router.query.id as string});

  if(CommentsLoading) return <LoadingPage/>;
  if(!commentData) return <div>Something went wrong</div>;

  return (
    <div className ="flex flex-col">
      {commentData?.map((fullPost) => (
        <CommentView {...fullPost} key={fullPost.comment.id}/>
      ))}
    </div>
  );
};
const PostFeed = () => {
  const router = useRouter();
  console.log(router.query.id as string)
  const { data: commentData, isLoading: CommentsLoading } = api.posts.search.useQuery({searchString: router.query.id as string});

  if(CommentsLoading) return <LoadingPage/>;
  if(!commentData) return <div>Something went wrong</div>;

  return (
    <div className ="flex flex-col">
      {commentData?.map((fullPost) => (
        <PostView {...fullPost} key={fullPost.post.id}/>
      ))}
    </div>
  );
};

const SearchPage: NextPage<{searchString: string}> = ({searchString}) => {
  return (
    <>
      <Head>
        <title>{`${searchString ?? ""}`}</title>
      </Head>
        <NavBar/>
        <PageLayout>
          <PostFeed/>
          <CommentFeed />
        </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) =>{
  const ssg = generateSSGHelper();

  const id = context.params?.id;
  if(typeof id !== "string") throw new Error ("no id");
  await ssg.comments.search.prefetch({searchString: id});
  await ssg.comments.search.prefetch({searchString: id});
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

export default SearchPage;