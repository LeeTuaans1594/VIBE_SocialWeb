import { useEffect, useState } from "react"
import UserHeader from "../components/UserHeader"
import { useParams } from "react-router-dom";
import useShowToast from "../hooks/useShowToast";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react"; // Chỉ import Box từ Chakra UI
import Post from "../components/Post";
import useGetUserProfile from "../hooks/useGetUserProfile";
import { useRecoilState } from "recoil";
import postsAtom from "../atoms/postsAtom";


const UserPage = () => {
  const {user, loading} = useGetUserProfile();
  const { username } = useParams();
  const showToast = useShowToast();
  const [posts, setPosts] = useRecoilState(postsAtom)
  const [fetchingPosts, setFetchingPosts] = useState(true);
  useEffect(() => {
		const getPosts = async () => {
			if (!user) return;
			setFetchingPosts(true);
			try {
				const res = await fetch(`/api/posts/user/${username}`);
				const data = await res.json();
				console.log(data);
				setPosts(data);
			} catch (error) {
				showToast("Error", error.message, "error");
				setPosts([]);
			} finally {
				setFetchingPosts(false);
			}
		};

		getPosts();
	}, [username, showToast, setPosts, user]);

  if(!user && loading){
    return (
      <Flex justifyContent={"center"}>
        <Spinner size={"xl"}/>
      </Flex>
    );
  }
  if(!user && !loading) {
    return (
      <Box pt={10} textAlign="center"> {/* Tăng padding top và căn giữa text */}
        <Text>User not found</Text>
      </Box>
    );
  }
  return (
    <Box pt={10}> {/* Thêm padding top */}
      <UserHeader user={user}/>

      {!fetchingPosts && posts.length === 0 && <h1>User has not posts.</h1>}
      {fetchingPosts && (
        <Flex justifyContent={"center"} my={12}>
          <Spinner size={"xl"} />
        </Flex>
      )}

      {posts.map((post) => (
        <Post key={post._id} post={post} postedBy={post.postedBy}/>
      ))}
    </Box>
  )
}

export default UserPage;