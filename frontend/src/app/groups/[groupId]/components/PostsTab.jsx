import { useState, useEffect } from 'react'
import PostForm from '../../../home/components/PostForm'

export default function PostsTab({ group, showPostForm, setShowPostForm }) {
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [postingComment, setPostingComment] = useState({})

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`/api/groups/${group.id}/posts`)
        if (!res.ok) throw new Error('Failed to fetch posts')
        const data = await res.json()
        setPosts(data || [])
        
        if (data?.length) {
          data.forEach(post => fetchComments(post.id))
        }
      } catch (err) {
        console.error('Failed to fetch posts', err)
      }
    }

    fetchPosts()
  }, [group.id])

  const fetchComments = async (postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      const res = await fetch(`/api/groups/${group.id}/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to fetch comments')

      const data = await res.json()
      setComments(prev => ({
        ...prev,
        [postId]: data || []
      }))
    } catch (err) {
      console.error('Failed to fetch comments', err)
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleCommentSubmit = async (postId) => {
    const content = commentInputs[postId]?.trim()
    if (!content) return

    try {
      setPostingComment(prev => ({ ...prev, [postId]: true }))

      const res = await fetch(`/api/groups/${group.id}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to post comment')

      const newComment = await res.json()
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }))
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }))
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setPostingComment(prev => ({ ...prev, [postId]: false }))
    }
  }

  return (
    <>
      <button
        onClick={() => setShowPostForm(true)}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Create Post
      </button>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        {posts.length > 0 ? (
          posts.map(post => (
            <PostItem 
              key={post.id}
              post={post}
              comments={comments}
              loadingComments={loadingComments}
              commentInputs={commentInputs}
              postingComment={postingComment}
              onCommentChange={(value) => setCommentInputs(prev => ({ ...prev, [post.id]: value }))}
              onCommentSubmit={() => handleCommentSubmit(post.id)}
            />
          ))
        ) : (
          <p className="text-gray-400">No posts yet. Be the first to post!</p>
        )}
      </div>
    </>
  )
}

function PostItem({ post, comments, loadingComments, commentInputs, postingComment, onCommentChange, onCommentSubmit }) {
  return (
    <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
      <p className="text-white">{post.content}</p>
      {post.image && (
        <img
          src={`${post.image}`}
          alt="Post"
          className="mt-2 rounded-lg max-w-full h-auto"
        />
      )}

      <div className="mt-4">
        {loadingComments[post.id] ? (
          <div className="text-gray-400 text-sm">Loading comments...</div>
        ) : (
          <div className="space-y-3">
            {comments[post.id]?.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}

        <CommentInput 
          value={commentInputs[post.id] || ''}
          onChange={(e) => onCommentChange(e.target.value)}
          onSubmit={onCommentSubmit}
          disabled={postingComment[post.id]}
          posting={postingComment[post.id]}
        />
      </div>
    </div>
  )
}

function CommentItem({ comment }) {
  return (
    <div className="p-3 bg-gray-600/30 rounded">
      <p className="text-sm text-white">{comment.content}</p>
      <p className="text-xs text-gray-400 mt-1">
        {comment.creator_name} • {new Date(comment.created_at).toLocaleString()}
      </p>
    </div>
  )
}

function CommentInput({ value, onChange, onSubmit, disabled, posting }) {
  return (
    <div className="flex items-center gap-2 mt-3">
      <input
        type="text"
        placeholder="Add a comment..."
        value={value}
        onChange={onChange}
        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {posting ? 'Posting...' : 'Post'}
      </button>
    </div>
  )
}