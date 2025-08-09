"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "./components/Navbar";
import PostForm from "./components/PostForm";
import MessageSidebar from "../messages/components/MessageSidebar";
import ChatBox from "../messages/components/ChatBox";
import Post from './components/Post'
import styles from './HomePage.module.css'
import { useSharedWorker } from '../../contexts/SharedWorkerContext';

export default function HomePage() {
  const { sendMessage, messages, isConnected } = useSharedWorker();
  // States for posts, user, UI, etc.
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const [showMessages, setShowMessages] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false)
  const [input, setInput] = useState({});

  const removeNotificationCallback = useRef(null);

  const router = useRouter();

  const handleNotificationRemoved = useCallback((removeCallback) => {
    removeNotificationCallback.current = removeCallback;
  }, []);

  const onNotificationRemoved = useCallback((criteria) => {
    if (removeNotificationCallback.current) {
      removeNotificationCallback.current(criteria);
    }
  }, []);

  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  const openMessages = () => {
    setShowMessages(true);
  };

  const openChat = (user) => {
    if (!openChats.some((c) => (c.id || c.ID) === (user.id || user.ID))) {
      setOpenChats((prev) => [...prev, user]);
    }
  };

  useEffect(() => {
    fetchChatUsers();
    fetchUser();
    fetchPosts();
  }, []);

  const fetchChatUsers = async () => {
    // try {
    //   const res = await fetch("http://localhost:8080/api/chat-users", {
    //     credentials: "include",
    //   });
    //   if (!res.ok) throw new Error("Failed to fetch users");
    //   const data = await res.json();
    //   //setChatUsers(data);
    // } catch (err) {
    //   console.error("Error fetching users:", err);
    // }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/profile", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unauthorized");

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Error loading profile:", err);
      router.push("/login");
    }
  };

  const fetchPosts = () => {
    setLoading(true);
    fetch("http://localhost:8080/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error("Error fetching posts:", err))
      .finally(() => setLoading(false));
  };

  const fetchUserById = async (userId) => {
    router.push(`/profile/${userId}`);
  };

  const handleSubmit = async (e, selectedRecipientIds = []) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    if (image) {
      formData.append("image", image);
    }

    try {
      let finalRecipientIds = [];

      if (privacy === "custom") {
        finalRecipientIds = selectedRecipientIds;
      } else if (privacy === "followers" || privacy === "private") {
        const res = await fetch("http://localhost:8080/api/recipients", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Impossible de récupérer les destinataires");
        const data = await res.json();
        finalRecipientIds = data.map((user) => user.id);
      }

      finalRecipientIds.forEach(id => {
        formData.append("recipient_ids", id);
      });

      const res = await fetch("http://localhost:8080/api/posts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erreur lors de la publication");

      setSuccess("✅ Post publié !");
      setContent("");
      setImage(null);
      setPrivacy("public");

      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

      fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/api/search?query=${value}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to search users");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Error searching users:", err);
      }
    } else {
      setResults([]);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        router.push("/login");
      } else {
        throw new Error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const fileInputRef = useRef();

  return (
    <div className={styles.pageContainer}>
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
        fetchChatUsers={fetchChatUsers}
        onNotificationRemoved={onNotificationRemoved}
        fetchUserById={fetchUserById}
        setSearch={setSearch}
        setResults={setResults}
      />

      {showMessages && user && (
        <MessageSidebar
          chatUsers={chatUsers}
          showMessages={showMessages}
          setShowMessages={setShowMessages}
          openChat={openChat}
          currentUserId={user.ID}
          fetchChatUsers={fetchChatUsers}
        />
      )}

      <div className={styles.postFormContainer}>
        {showPostForm && (
          <div className={styles.postFormWrapper}>
            <PostForm
              content={content}
              setContent={setContent}
              image={image}
              setImage={setImage}
              privacy={privacy}
              setPrivacy={setPrivacy}
              handleSubmit={handleSubmit}
              creating={creating}
              ref={fileInputRef}
            />
          </div>
        )}
      </div>


      {posts === null ? (
        <p className={styles.noPosts}>Aucun post à afficher.</p>
      ) : (
        posts.map(post => (
          <Post key={post.id} post={post} fetchUserById={fetchUserById} />
        ))
      )}
      <div className={styles.chatBoxContainer}>
        {openChats.map((u) => (
          <ChatBox
            key={u.id || u.ID}
            recipient={u}
            currentUser={user}
            messages={messages}
            input={input[u.id || u.ID] || ''}
            setInput={(val) => setInput(prev => ({ ...prev, [u.id || u.ID]: val }))}
            onSendMessage={(chatMsg) => sendMessage({ type: "SEND", message: chatMsg, userId: user.ID })}
            onClose={() => setOpenChats(prev => prev.filter(c => (c.id || c.ID) !== (u.id || u.ID)))}
            isConnected={isConnected}
            userId={user.ID}
          />
        ))}
      </div>
    </div>
  )
}