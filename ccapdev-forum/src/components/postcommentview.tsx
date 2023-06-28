
import dayjs from "dayjs";
import { api, type RouterOutputs } from "~/utils/api";
import Link from "next/link";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { LoadingSpinner } from "./loading";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
dayjs.extend(relativeTime);
type CommentWithUser = RouterOutputs["comments"]["getCommentByPostId"][number];
export const PostCommentView = (props: CommentWithUser) => {
  const user = useUser();
  const {comment, author, commentUpvotesCount, commentDownvotesCount} = props;
  const createdAt = dayjs(comment.createdAt).fromNow();
  const updatedAt = dayjs(comment.updatedAt).fromNow();
  const [updateContent, setUpdateContent] = useState(comment.content);
  const ctx = api.useContext(); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setUpdateContent(comment.content);
  };
  const [voteType, setVoteType] = useState<null | string>(null);
  const vote = api.votes.findCommentPost.useQuery({commentId: comment.id});
  const [VoteStatus, setVoteStatus] = useState(vote.data?.vote);
  const {mutate: mutationVote} = api.comments.updateCommentVote.useMutation({
    onSuccess: () =>{
      void ctx.comments.getAll.invalidate();
      void ctx.votes.getAll.invalidate();
      setVoteStatus(!VoteStatus);
    }
  });
  const handleVoteClick = (type: string) => {
    if (type === 'upvote') {
      mutationVote({commentId: comment.id, vote: true})
      setVoteType('upvote');
    }
    if(type === 'downvote') {
      mutationVote({commentId: comment.id, vote: false})
      setVoteType('downvote');
    }
  };
  const {mutate: mutationUpdate, isLoading: isPosting} = api.comments.update.useMutation({
    onSuccess: () =>{
      setUpdateContent(updateContent);
      setIsMenuOpen(!isMenuOpen);
      void ctx.comments.getCommentByPostId.invalidate();
      
    }
  });
  const {mutate: mutationDelete, isLoading: isDeleting} = api.comments.delete.useMutation({
    onSuccess: () =>{
      setUpdateContent("");
      setIsMenuOpen(!isMenuOpen);
      void ctx.comments.getCommentByPostId.invalidate();
    }
  });
  {(isPosting || isDeleting) && (
    <div className="flex justify-center item-center">
      <LoadingSpinner size={20} />
    </div>
  )}
  function handleUpdate(commentId: string, updatedContent: string){
    mutationUpdate({id: commentId, content: updatedContent})
  }
  function handleDelete(commentId: string){
    mutationDelete({id: commentId})
  }
  return(
    <>
    <div key={comment.id} className ="flex border-b border-slate-400 p-8 gap-3 relative">
      <div className="flex flex-col flex-shrink-0">
        <Image 
          src={author.profileImageUrl} 
          alt={`${author.username ?? ""}'s profile picture`}
          className="rounded-full flex flex-col" 
          width={56}
          height={56}
        />
      </div>
      
      <div className="flex flex-col">
        <div className="flex gap-2">
          <span>{author.username}</span>
          <span className="font-thin">{ `${dayjs(comment.createdAt).fromNow()}` }</span>
          {(createdAt !== updatedAt) && <span className="ml-2 font-thin">edited</span>}
        </div>
        <Link href={`/comment/${comment.id}`}>
          <div className="flex flex-col w-full">
              {!isMenuOpen && (
                <>
                  <span className="font-thin">{comment.content}</span>
                </>
              )}
          </div>
        </Link>
        
      
      {(user.user?.id === comment.authorId) && (
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
              <div className = "flex border-b border-white-100 ">
                
                <div className ="flex w-96">
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
                        if( updateContent !==""){
                          handleUpdate(comment.id, updateContent);
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
            
              {updateContent !=="" && !isPosting && (user.user?.id === comment.authorId) && (
                <div className="absolute top-0 right-0 p-2 mt-5 shadow flex flex-col">
                  <button onClick={() => handleUpdate(comment.id, updateContent)}>
                    Update
                  </button>
                  <button onClick={() => handleDelete(comment.id)}>
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
              <span>{commentUpvotesCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className={`rounded-full p-1 ${VoteStatus === false ? 'bg-red-500' : ''}`}
                onClick={() => handleVoteClick('downvote')}
              >
                <FontAwesomeIcon icon={faThumbsDown} className="text-xl" />
              </button>
              <span>{commentDownvotesCount}</span>
            </div>
          </div>
        </div>  
    </div>
    </>
  );
};