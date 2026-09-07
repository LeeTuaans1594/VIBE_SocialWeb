import { Box, Flex, Spinner } from "@chakra-ui/react";
import useShowToast from "../hooks/useShowToast";
import { useEffect, useState } from "react";
import Post from "../components/Post";
import { useRecoilState } from "recoil";
import postsAtom from "../atoms/postsAtom";
import SuggestedUsers from "../components/SuggestedUsers";

const HomePage = () => {
  const [posts, setPosts] = useRecoilState(postsAtom); // Sử dụng atom từ Recoil để quản lý posts
  const [loading, setLoading] = useState(false); // Quản lý trạng thái loading
  const showToast = useShowToast(); // Hook để hiển thị thông báo

  useEffect(() => {
    const getFeedPosts = async () => {
      setLoading(true); // Bắt đầu loading
      setPosts([]); // Đặt posts về mảng rỗng để xóa dữ liệu cũ
      try {
        const res = await fetch("/api/posts/feed"); // Gửi request lấy dữ liệu bài viết
        const data = await res.json(); // Chuyển đổi phản hồi thành JSON

        if (data.error) {
          showToast("Error", data.error, "error"); // Hiển thị lỗi nếu có
          return;
        }

        console.log(data);

        // Kiểm tra xem data có phải là mảng hay không
        if (Array.isArray(data)) {
          setPosts(data); // Cập nhật posts với dữ liệu mới
        } else {
          showToast("Error", "Invalid data format", "error"); // Thông báo nếu phản hồi không hợp lệ
        }
      } catch (error) {
        showToast("Error", error.message, "error"); // Hiển thị thông báo lỗi nếu request thất bại
      } finally {
        setLoading(false); // Kết thúc loading
      }
    };

    getFeedPosts(); // Gọi hàm lấy bài viết khi component HomePage render
  }, [showToast, setPosts]); // useEffect chỉ chạy khi `showToast` hoặc `setPosts` thay đổi

  return (
    <Flex gap='10' alignItems={"flex-start"}>
      <Box flex={70}>
        {!loading && (!posts || posts.length === 0) && (
          <h1>Follow some users to see the feed</h1> // Hiển thị thông báo nếu không có bài viết nào
        )}

        {loading && (
          <Flex justify={"center"}>
            <Spinner size="xl" /> {/* Hiển thị spinner khi đang tải */}
          </Flex>
        )}

        {posts && Array.isArray(posts) && posts.map((post) => (
          <Post key={post._id} post={post} postedBy={post.postedBy} /> // Hiển thị các bài viết
        ))}
      </Box>
      <Box flex={30} display={{base: "none", md:"block",}}>
        <SuggestedUsers/>
      </Box>
    </Flex>
  );
};

export default HomePage;
