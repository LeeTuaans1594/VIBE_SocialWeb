import { useState } from "react";
import useShowToast from "./useShowToast";
import userAtom from "../atoms/userAtom";
import { useRecoilValue } from "recoil";

const useFollowUnfollow = (user) => {
  const currentUser = useRecoilValue(userAtom);
  const [following, setFollowing] = useState(user.followers.includes(currentUser?._id));
  const [updating, setUpdating] = useState(false);
  const showToast = useShowToast();
  const [followersList, setFollowersList] = useState(user.followers);

  const handleFollowUnfollow = async () => {
    if (!currentUser) {
      showToast("Error", "Please login to follow", "error");
      return;
    }
    if (updating) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/users/follow/${user._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      if (following) {
        showToast("Success", `Unfollowed ${user.name}`, "success");
        setFollowersList(prev => prev.filter(id => id !== currentUser?._id));
      } else {
        showToast("Success", `Followed ${user.name}`, "success");
        setFollowersList(prev => [...prev, currentUser?._id]);
      }
      setFollowing(!following);

    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  return { handleFollowUnfollow, updating, following, followerCount: followersList.length };
};

export default useFollowUnfollow;