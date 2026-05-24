"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Globe2, Share2, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type ShareUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type ShareModalProps = {
  analysisId: string;
  isPublic: boolean;
  analysisUrl: string;
  initialSharedWith?: string[];
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "U";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function ShareModal({
  analysisId,
  isPublic,
  analysisUrl,
  initialSharedWith = [],
}: ShareModalProps) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [isPublicState, setIsPublicState] = useState(isPublic);
  const [sharedWith, setSharedWith] = useState<Set<string>>(
    new Set(initialSharedWith),
  );
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [query, setQuery] = useState("");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const sharedUsers = useMemo(() => {
    const byId = new Map(users.map((user) => [user.id, user]));
    return Array.from(sharedWith).map((id) => {
      const user = byId.get(id);
      if (user) {
        return user;
      }
      return {
        id,
        name: "Shared user",
        email: "",
        avatar: "",
      } satisfies ShareUser;
    });
  }, [sharedWith, users]);

  useEffect(() => {
    if (!open || usersLoaded) {
      return;
    }

    const controller = new AbortController();

    const loadUsers = async () => {
      setLoadingUsers(true);
      setUsersError("");

      try {
        const response = await fetch("/api/users", {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load users. Try again.");
        }

        const payload = (await response.json()) as
          | ShareUser[]
          | { data?: ShareUser[] };

        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        setUsers(data);
        setUsersLoaded(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setUsersError("Could not load users. Try again.");
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();

    return () => {
      controller.abort();
    };
  }, [open, usersLoaded]);

  async function togglePublic() {
    const previous = isPublicState;
    setIsPublicState(!previous);
    setTogglingPublic(true);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          action: "toggle_public",
        }),
      });

      if (!response.ok) {
        throw new Error("Could not update public sharing.");
      }

      const payload = (await response.json()) as { isPublic?: boolean };
      if (typeof payload.isPublic === "boolean") {
        setIsPublicState(payload.isPublic);
      }
    } catch {
      setIsPublicState(previous);
      toast({
        title: "Could not update sharing",
        description: "Please try again.",
      });
    } finally {
      setTogglingPublic(false);
    }
  }

  async function copyLink() {
    if (!isPublicState) {
      return;
    }

    try {
      await navigator.clipboard.writeText(analysisUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy the link manually.",
      });
    }
  }

  async function shareWithUser(targetUserId: string) {
    if (sharedWith.has(targetUserId)) {
      return;
    }

    const next = new Set(sharedWith);
    next.add(targetUserId);
    setSharedWith(next);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          action: "add_user",
          sharedWithUserId: targetUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not share with this user.");
      }
    } catch {
      setSharedWith((previous) => {
        const rollback = new Set(previous);
        rollback.delete(targetUserId);
        return rollback;
      });
      toast({
        title: "Could not share analysis",
        description: "Please try again.",
      });
    }
  }

  async function removeShare(targetUserId: string) {
    if (!sharedWith.has(targetUserId)) {
      return;
    }

    setSharedWith((previous) => {
      const next = new Set(previous);
      next.delete(targetUserId);
      return next;
    });

    try {
      const response = await fetch("/api/share", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          sharedWithUserId: targetUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not remove share.");
      }
    } catch {
      setSharedWith((previous) => {
        const rollback = new Set(previous);
        rollback.add(targetUserId);
        return rollback;
      });
      toast({
        title: "Could not remove share",
        description: "Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 size={14} />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-1rem)] p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Share analysis</DialogTitle>
          <DialogDescription>
            Control who can view this analysis.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="public">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public" className="gap-1.5">
              <Globe2 size={14} />
              Public Link
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-1.5">
              <Users size={14} />
              Private
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Anyone with the link can view
                </p>
                <p className="text-xs text-text-secondary">
                  Turn on link sharing to make this analysis publicly
                  accessible.
                </p>
              </div>
              <Switch
                checked={isPublicState}
                onCheckedChange={togglePublic}
                disabled={togglingPublic}
                aria-label="Toggle public link sharing"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={isPublicState ? analysisUrl : ""}
                placeholder="Enable public link first"
                className={
                  !isPublicState
                    ? "bg-background-subtle text-text-tertiary"
                    : ""
                }
              />
              <Button
                variant="outline"
                onClick={copyLink}
                disabled={!isPublicState}
                className="shrink-0 gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="private" className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users by name or email..."
            />

            <div className="rounded-md border border-border">
              <ScrollArea className="h-64 p-2">
                {loadingUsers ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md p-2"
                      >
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : usersError ? (
                  <p className="p-3 text-sm text-fallacy">
                    Could not load users. Try again.
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="p-3 text-sm text-text-secondary">
                    No users found.
                  </p>
                ) : (
                  <div className="space-y-1 p-1">
                    {filteredUsers.map((user) => {
                      const alreadyShared = sharedWith.has(user.id);

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 rounded-md p-2 hover:bg-background-subtle"
                        >
                          <Avatar>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>
                              {initialsFromName(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-text-secondary">
                              {user.email || "No email"}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant={alreadyShared ? "default" : "outline"}
                            onClick={() => shareWithUser(user.id)}
                            disabled={alreadyShared}
                            className={
                              alreadyShared
                                ? "bg-fact text-white hover:bg-fact"
                                : ""
                            }
                          >
                            {alreadyShared ? (
                              <span className="inline-flex items-center gap-1">
                                <Check size={14} />
                                Shared
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <UserPlus size={14} />
                                Share
                              </span>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-text-primary">
                Already shared with
              </p>
              {sharedUsers.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No private shares yet.
                </p>
              ) : (
                <div className="space-y-1 rounded-md border border-border p-2">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-background-subtle"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {user.email || user.id}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeShare(user.id)}
                        className="px-2"
                        aria-label={`Remove share for ${user.name}`}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
