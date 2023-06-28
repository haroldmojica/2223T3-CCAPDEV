import {SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import { api } from "~/utils/api";

import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { useState } from "react";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { PostView } from "~/components/postview";
import { NavBar } from "~/components/navbar";

const CreatePostWizard = () =>{
  const {user} = useUser();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const ctx = api.useContext();

  const {mutate, isLoading: isPosting} = api.posts.create.useMutation({
    onSuccess: ()=>{
      setTitle("");
      setContent("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (e) =>{
      const errorMessage =e.data?.zodError?.fieldErrors.content;
      if(errorMessage && errorMessage[0]){
        toast.error(errorMessage[0]);
      }else{
        toast.error("Failed to post!");
      }
    }
  });

  if(!user) return null;
  return (
    <div className = "border-b border-slate-400 p-8 flex flex-col">
      <div className ="flex w-full gap-3 flex-col">
        <input 
          placeholder="Title" 
          className="bg-transparent grow outline-none"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e)=>{
            if(e.key === "Enter"){
              e.preventDefault();
              if(title !=="" && content !==""){
                mutate({title,content});
              }
            }
          }}
          disabled={isPosting}
        />
        <textarea 
          id="message" 
          className="block p-2.5 w-full text-sm bg-transparent rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500" 
          placeholder="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e)=>{
            if(e.key === "Enter"){
              e.preventDefault();
              if(title !=="" && content !==""){
                mutate({title,content});
              }
            }
          }}
          disabled={isPosting}
          />
        {title !=="" && content !=="" && !isPosting && (
          <button 
          onClick={() => mutate({title, content})} 
          className="primaryButton hover:bg-green-300 text-white font-bold p-1 rounded-lg"
          >
            Post
          </button>)}
        {isPosting && (
          <div className="flex justify-center item-center">
            <LoadingSpinner size={20}/>
          </div>
        )}
      </div>
    </div>
  );
};




const PostFeed = () =>{
  const { data: postData, isLoading: postsLoading } = api.posts.getAll.useQuery();
  if(postsLoading) return <LoadingPage/>;
  if(!postData) return <div>Something went wrong</div>;
  return (
    <div className ="flex flex-col">
      {postData?.map((fullPost) => (
        <PostView {...fullPost} key={fullPost.post.id}/>
      ))}
    </div>
  );
};



const Home: NextPage = () => {
  const { isLoaded: userLoaded } = useUser();

  //fetch all necessary data asap
  api.posts.getAll.useQuery();
  
  if(!userLoaded) return < div/>;
  
  return (
        <>
        <NavBar /><PageLayout>
      <CreatePostWizard />
      <PostFeed />
    </PageLayout>
    </>

  );
};

export default Home;
