import { Link } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import '@/styles/pages/Home.scss';

const Home = () => {
  const user = useUserStore(state => state.user);

  return (
    <div className="home-page">
      <h1>欢迎来到首页</h1>
      {user ? <p>你好, {user.name}!</p> : <p>你好, 访客!</p>}
      <Link to="/about">关于我们</Link>
    </div>
  );
};

export default Home;
