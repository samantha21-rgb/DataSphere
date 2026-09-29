"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Discussion = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  published: boolean;
  pinned: boolean;
  locked: boolean;
  allow_replies: boolean;
  allow_attachments: boolean;
  available_from: string | null;
  available_until: string | null;
  created_by: string;
  created_at: string;
};

type Unit = {
  id: number;
  name: string;
  code: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type Post = {
  id: number;
  discussion_id: number;
  user_id: string;
  parent_post_id: number | null;
  content: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile | null;
  likes: number;
  likedByMe: boolean;
};

type Reaction = {
  id: number;
  post_id: number;
  user_id: string;
  reaction: string;
};

export default function DiscussionThreadPage() {
  const params = useParams();
  const discussionId = Number(params.id);

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const [newPost, setNewPost] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!discussionId || Number.isNaN(discussionId)) {
      setError("Invalid discussion.");
      setLoading(false);
      return;
    }

    loadDiscussion();
  }, [discussionId]);

  async function loadDiscussion() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to view discussions.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const discussionResult = await supabase
      .from("discussions")
      .select("*")
      .eq("id", discussionId)
      .eq("published", true)
      .single();

    if (discussionResult.error || !discussionResult.data) {
      setError(
        discussionResult.error?.message ||
          "This discussion could not be found."
      );
      setLoading(false);
      return;
    }

    const loadedDiscussion = discussionResult.data as Discussion;
    setDiscussion(loadedDiscussion);

    const [unitResult, postsResult] = await Promise.all([
      supabase
        .from("units")
        .select("id, name, code")
        .eq("id", loadedDiscussion.unit_id)
        .maybeSingle(),

      supabase
        .from("discussion_posts")
        .select("*")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true }),
    ]);

    if (unitResult.data) {
      setUnit(unitResult.data as Unit);
    }

    if (postsResult.error) {
      setError(postsResult.error.message);
      setLoading(false);
      return;
    }

    const rawPosts = (postsResult.data || []) as Post[];

    if (rawPosts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set(rawPosts.map((post) => post.user_id))
    );

    const postIds = rawPosts.map((post) => post.id);

    const [profilesResult, reactionsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .in("id", userIds),

      supabase
        .from("discussion_reactions")
        .select("*")
        .in("post_id", postIds),
    ]);

    const profilesMap: Record<string, Profile> = {};

    for (const profile of profilesResult.data || []) {
      profilesMap[profile.id] = profile as Profile;
    }

    const reactions = (reactionsResult.data || []) as Reaction[];

    const postsWithMetadata = rawPosts.map((post) => {
      const postReactions = reactions.filter(
        (reaction) =>
          reaction.post_id === post.id &&
          reaction.reaction === "like"
      );

      return {
        ...post,
        profile: profilesMap[post.user_id] || null,
        likes: postReactions.length,
        likedByMe: postReactions.some(
          (reaction) => reaction.user_id === user.id
        ),
      };
    });

    setPosts(postsWithMetadata);
    setLoading(false);
  }

  function displayName(profile?: Profile | null) {
    if (!profile) return "Student";

    return (
      profile.full_name ||
      profile.name ||
      profile.email ||
      "Student"
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const rootPosts = useMemo(
    () => posts.filter((post) => post.parent_post_id === null),
    [posts]
  );

  function repliesFor(postId: number) {
    return posts.filter(
      (post) => post.parent_post_id === postId
    );
  }

  async function createPost(
    content: string,
    parentPostId: number | null = null
  ) {
    if (!currentUserId) {
      setError("You must be logged in.");
      return;
    }

    const cleaned = content.trim();

    if (!cleaned) {
      setError("Write something before posting.");
      return;
    }

    if (!discussion) return;

    if (discussion.locked) {
      setError("This discussion is locked.");
      return;
    }

    if (parentPostId !== null && !discussion.allow_replies) {
      setError("Replies are disabled for this discussion.");
      return;
    }

    setPosting(true);
    setError("");

    const result = await supabase
      .from("discussion_posts")
      .insert({
        discussion_id: discussion.id,
        user_id: currentUserId,
        parent_post_id: parentPostId,
        content: cleaned,
      })
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
      setPosting(false);
      return;
    }

    const createdPost = result.data as Post;

    createdPost.profile = {
      id: currentUserId,
      full_name: "You",
    };

    createdPost.likes = 0;
    createdPost.likedByMe = false;

    setPosts((current) => [...current, createdPost]);

    if (parentPostId === null) {
      setNewPost("");
    } else {
      setReplyText("");
      setReplyingTo(null);
    }

    setPosting(false);
  }

  async function updatePost(postId: number) {
    const cleaned = editText.trim();

    if (!cleaned) {
      setError("Post cannot be empty.");
      return;
    }

    setError("");

    const result = await supabase
      .from("discussion_posts")
      .update({
        content: cleaned,
        edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", currentUserId);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              content: cleaned,
              edited: true,
              updated_at: new Date().toISOString(),
            }
          : post
      )
    );

    setEditingPostId(null);
    setEditText("");
  }

  async function deletePost(postId: number) {
    const confirmed = window.confirm(
      "Delete this post? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");

    const result = await supabase
      .from("discussion_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUserId);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPosts((current) =>
      current.filter(
        (post) =>
          post.id !== postId &&
          post.parent_post_id !== postId
      )
    );
  }

  async function toggleLike(post: Post) {
    if (!currentUserId) return;

    setError("");

    if (post.likedByMe) {
      const result = await supabase
        .from("discussion_reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .eq("reaction", "like");

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likes: Math.max(0, item.likes - 1),
                likedByMe: false,
              }
            : item
        )
      );
    } else {
      const result = await supabase
        .from("discussion_reactions")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction: "like",
        });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likes: item.likes + 1,
                likedByMe: true,
              }
            : item
        )
      );
    }
  }

  function renderPost(post: Post, depth = 0) {
    const replies = repliesFor(post.id);
    const isOwnPost = post.user_id === currentUserId;
    const isEditing = editingPostId === post.id;

    return (
      <div key={post.id} className={depth > 0 ? "ml-6 md:ml-12" : ""}>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {displayName(post.profile)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {displayName(post.profile)}
                </div>

                <div className="text-xs text-slate-500">
                  {formatDate(post.created_at)}
                  {post.edited && " · edited"}
                </div>
              </div>
            </div>

            {isOwnPost && !isEditing && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPostId(post.id);
                    setEditText(post.content);
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deletePost(post.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            {isEditing ? (
              <div>
                <textarea
                  value={editText}
                  onChange={(event) =>
                    setEditText(event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updatePost(post.id)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostId(null);
                      setEditText("");
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {post.content}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => toggleLike(post)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  post.likedByMe
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {post.likedByMe ? "♥" : "♡"}{" "}
                {post.likes}
              </button>

              {discussion?.allow_replies &&
                !discussion.locked && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(
                        replyingTo === post.id ? null : post.id
                      );
                      setReplyText("");
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Reply
                  </button>
                )}
            </div>
          )}

          {replyingTo === post.id &&
            discussion?.allow_replies &&
            !discussion.locked && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <textarea
                  value={replyText}
                  onChange={(event) =>
                    setReplyText(event.target.value)
                  }
                  placeholder="Write your reply..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={posting}
                    onClick={() =>
                      createPost(replyText, post.id)
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {posting ? "Posting..." : "Post Reply"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
        </article>

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) =>
              renderPost(reply, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500 shadow-sm">
            Loading discussion...
          </div>
        </div>
      </main>
    );
  }

  if (!discussion) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/discussions"
            className="mb-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            ← Back to Discussions
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
            {error || "Discussion not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/discussions"
          className="mb-5 inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          ← Back to Discussions
        </Link>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap gap-2">
            {discussion.pinned && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                📌 Pinned
              </span>
            )}

            {discussion.locked && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                🔒 Locked
              </span>
            )}

            {unit && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {unit.code || unit.name}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
            {discussion.title}
          </h1>

          {discussion.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {discussion.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>
              Started {formatDate(discussion.created_at)}
            </span>

            {discussion.locked ? (
              <span className="font-semibold text-red-600">
                Discussion locked
              </span>
            ) : discussion.allow_replies ? (
              <span>Replies enabled</span>
            ) : (
              <span>Replies disabled</span>
            )}

            {unit && (
              <span>
                Unit: {unit.name}
              </span>
            )}
          </div>
        </section>

        {!discussion.locked ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-bold">
              Join the discussion
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Share a question, answer, idea, or useful insight.
            </p>

            <textarea
              value={newPost}
              onChange={(event) =>
                setNewPost(event.target.value)
              }
              placeholder="Write your post..."
              rows={5}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={posting || !newPost.trim()}
                onClick={() => createPost(newPost)}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post to Discussion"}
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            This discussion has been locked. You can read existing
            posts, but you cannot add new posts or replies.
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Conversation
            </h2>

            <span className="text-sm text-slate-500">
              {posts.length}{" "}
              {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {rootPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-lg font-semibold">
                No posts yet
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Be the first student to start the conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rootPosts.map((post) => renderPost(post))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}