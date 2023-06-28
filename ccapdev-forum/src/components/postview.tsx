
import dayjs from "dayjs";
import { api, type RouterOutputs } from "~/utils/api";
import Link from "next/link";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState } from "react";
import { LoadingSpinner } from "./loading";
import { useUser } from "@clerk/nextjs";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
dayjs.extend(relativeTime);



type PostWithUser = RouterOutputs["posts"]["getAll"][number];
export const PostView = (props: PostWithUser) => {
  const user = useUser();
  const {post, author, postUpvotesCount, postDownvotesCount} = props;
  const createdAt = dayjs(post.createdAt).fromNow();
  const updatedAt = dayjs(post.updatedAt).fromNow();
  const [updatetitle, setUpdatetitle] = useState(post.title);
  const [updateContent, setUpdateContent] = useState(post.content);

  const ctx = api.useContext(); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [voteType, setVoteType] = useState<null | string>(null);
  const vote = api.votes.findPostVote.useQuery({postId: post.id});
  const [VoteStatus, setVoteStatus] = useState(vote.data?.vote);
  const {mutate: mutationVote} = api.posts.updatePostVote.useMutation({
    onSuccess: () =>{
      void ctx.posts.getAll.invalidate();
      void ctx.votes.getAll.invalidate();
      setVoteStatus(!VoteStatus);
    }
  });
  const handleVoteClick = (type: string) => {
    if (type === 'upvote') {
      mutationVote({postId: post.id, vote: true})
      setVoteType('upvote');
    }
    if(type === 'downvote') {
      mutationVote({postId: post.id, vote: false})
      setVoteType('downvote');
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setUpdateContent(post.content);
    setUpdatetitle(post.title);
  };
  const {mutate: mutationUpdate, isLoading: isPosting} = api.posts.update.useMutation({
    onSuccess: () =>{
      setUpdatetitle(updatetitle);
      setUpdateContent(updateContent);
      setIsMenuOpen(!isMenuOpen);
      void ctx.posts.getAll.invalidate();
      
    }
  });
  const {mutate: mutationDelete, isLoading: isDeleting} = api.posts.delete.useMutation({
    onSuccess: () =>{
      setUpdatetitle("");
      setUpdateContent("");
      setIsMenuOpen(!isMenuOpen);
      void ctx.posts.getAll.invalidate();
    }
  });
  {(isPosting || isDeleting) && (
    <div className="flex justify-center item-center">
      <LoadingSpinner size={20} />
    </div>
  )}
  function handleUpdate(postId: string,updatedtitle: string, updatedContent: string){
    mutationUpdate({id: postId, title: updatedtitle, content: updatedContent})
  }
  function handleDelete(postId: string){
    mutationDelete({postId})
  }
  
  return(
    <>
      <div key={post.id} className="flex border-b border-slate-400 p-8 flex-col relative">
        <div className="flex inline-block">
          <Link href={`/${author.username ?? ""}`}>{author.username ?? ""} </Link>
          <span className="ml-5 font-thin">{`${createdAt}`}</span>
          {(createdAt !== updatedAt) && <span className="ml-2 font-thin">edited</span>}
        </div>

        <Link href={`/post/${post.id}`}>
          <div className="flex flex-col">
            {!isMenuOpen && (
              <>
                <span className="text-lg">{post.title} </span>
                <span className="font-thin">{post.content}</span>
              </>
            )}
            
          </div>
        </Link>
        {(user.user?.id === post.authorId) && (
          <div
          className="cursor-pointer flex flex-col items-center justify-center absolute top-0 right-0 m-2"
          onClick={toggleMenu}
        >
          <div className="h-0.5 w-6 bg-white rounded-full mb-1"></div>
          <div className="h-0.5  w-6 bg-white rounded-full mb-1"></div>
          <div className="h-0.5  w-6 bg-white rounded-full"></div>
        </div>
        )}
          

          {isMenuOpen && (
            <>
                <div className = "flex flex-col">
                
                <div className ="flex w-full gap-3 flex-col">
                  <input 
                    placeholder="Title" 
                    className="bg-transparent grow outline-none border-b border-slate-400"
                    type="text"
                    value={updatetitle}
                    onChange={(e) => setUpdatetitle(e.target.value)}
                    onKeyDown={(e)=>{
                      if(e.key === "Enter"){
                        e.preventDefault();
                        if(updatetitle !=="" && updateContent !==""){
                          handleUpdate(post.id, updatetitle, updateContent);
                        }
                      }
                    }}
                    disabled={isPosting}
                  />
                  <input 
                    placeholder="Content" 
                    className="bg-transparent grow outline-none border-b border-slate-400" 
                    type="text"
                    name="content"
                    value={updateContent}
                    onChange={(e) => setUpdateContent(e.target.value)}
                    onKeyDown={(e)=>{
                      if(e.key === "Enter"){
                        e.preventDefault();
                        if(updatetitle !=="" && updateContent !==""){
                          handleUpdate(post.id, updatetitle, updateContent);
                        }
                      }
                    }}
                    disabled={isPosting}
                  />
                  
                  {isPosting && (
                    <div className="flex justify-center item-center">
                      <LoadingSpinner size={20}/>
                    </div>
                  )}
                </div>
              </div>
            
              {updatetitle !=="" && updateContent !=="" && !isPosting && (user.user?.id === post.authorId) && (
                <div className="absolute top-0 right-0 p-2 mt-5 shadow flex flex-col">
                  <button onClick={() => handleUpdate(post.id, updatetitle, updateContent)}>
                    Update
                  </button>
                  <button onClick={() => handleDelete(post.id)}>
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
          <div className="flex items-center ml-2 mt-4 -mb-5">
            <div className="flex flex-col items-center mr-4">
              <button
                className={`rounded-full p-1 ${VoteStatus === true ? 'bg-blue-500' : ''}`}
                onClick={() => handleVoteClick('upvote')}
              >
                <FontAwesomeIcon icon={faHeart} className="text-xl" />
              </button>
              <span>{postUpvotesCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className={`rounded-full p-1 ${VoteStatus === false ? 'bg-red-500' : ''}`}
                onClick={() => handleVoteClick('downvote')}
              >
                <FontAwesomeIcon icon={faThumbsDown} className="text-xl" />
              </button>
              <span>{postDownvotesCount}</span>
            </div>
          </div>

      </div>
        
      



      
      
      
    </>
  );
};
