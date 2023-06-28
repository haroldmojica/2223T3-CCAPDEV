import { useUser } from "@clerk/nextjs";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import Image from "next/image";
import { PageLayout } from "~/components/layout";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useState } from "react";
import toast from "react-hot-toast";
import { NavBar } from "~/components/navbar";

const CreatePostWizard = (props: {userId: string}) => {
  const { user } = useUser();
  const [description, setDescription] = useState("");
  const ctx = api.useContext();
  const { mutate, isLoading: isPosting } = api.profile.createDescription.useMutation({
    onSuccess: () => {
      setDescription("");
      void ctx.profile.getDescription.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.description;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to add description!");
      }
    },
  });

  if (!user) return null;
  return (
    <div className="border-b border-slate-400 p-8 flex">
      <div className="flex w-full gap-3">
        <input
          placeholder="description"
          className="bg-transparent grow outline-none"
          type="text"
          name="content"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (description !== "") {
                mutate({id: props.userId, description: description}); // Pass the postId from the router query
              }
            }
          }}
          disabled={isPosting}
        />
        {description !== "" && !isPosting && (
          <button onClick={() => mutate({ id: props.userId, description: description})}>
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

const ProfileFeed = (props: {userId: string}) =>{
    const {data: postdata, isLoading: postloading} = api.posts.getPostByUserId.useQuery({id: props.userId});
    const {data: commentData, isLoading: commentloading} = api.comments.getCommentByUserId.useQuery({userId: props.userId});
    if(postloading || commentloading) return <LoadingPage />;
    if(!postdata || postdata.length === 0 || !commentData || commentData.length===0) return <div>User has not posted</div>

    return (
        <div className="flex flex-col">
            {postdata.map((postdata) =>(<PostView {...postdata} key={postdata.post.id}/>))}
        </div>
    )
}

const ProfilePage: NextPage<{username: string}> = ({username}) => {
  const user = useUser();
  const {data: userProfiledata} = api.profile.getUserByUsername.useQuery({
    username,
  });
  if(!userProfiledata) return <div>404</div>
  const {data: userDescription} = api.profile.getDescription.useQuery({
    id: userProfiledata?.id,
  });

  return (
    <>
      <Head>
        <title>{userProfiledata.username}</title>
      </Head>
        <NavBar/>
        <PageLayout>
            <div className="h-48 p-2">
                <Image
                    src={userProfiledata.profileImageUrl}
                    alt={`${userProfiledata.username ?? ""}'s profile picture`}
                    width={168}
                    height={168}
                    className="rounded-full border-white border-2"
                />
            </div>
            <div className="h-[16px]"/>
            <div className="pl-5">
              <div className=" text-2xl font-bold">{userProfiledata.username ?? ""}</div>
              <div className=" text-2xl">{userDescription?.description ?? "no bio "}</div>
            </div>

              {(userProfiledata.id === user.user?.id) && (
                <CreatePostWizard userId={userProfiledata.id}/>
              )}

            <div className="border-b w-full border-slate-500"/>
            <ProfileFeed userId={userProfiledata?.id}/>
        </PageLayout>

    </>
  );
};




export const getStaticProps: GetStaticProps = async (context) =>{
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;
  if(typeof slug !== "string") throw new Error ("no slug");
  await ssg.profile.getUserByUsername.prefetch({username: slug})

  return {
    props:{
      trpcState: ssg.dehydrate(),
      username: slug,
    },
  };
};

export const getStaticPaths = () =>{
  return{paths: [], fallback: "blocking"};
};

export default ProfilePage;