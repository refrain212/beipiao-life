const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'beipiao-life-secret-key';

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务（提供前端文件）
app.use(express.static(path.join(__dirname, '../')));

// 模拟数据库（实际项目中应该用真实数据库）
const users = [];
const gameData = {};

// 验证token的中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '无效token' });
    req.user = user;
    next();
  });
}

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 检查用户名是否已存在
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const newUser = {
      id: users.length + 1,
      username,
      passwordHash,
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    // 生成token
    const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET);
    
    res.json({
      success: true,
      token,
      user: { id: newUser.id, username }
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }
    
    // 生成token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 保存游戏数据
app.post('/api/save-game', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    // 保存游戏数据
    gameData[userId] = {
      ...data,
      savedAt: new Date()
    };
    
    console.log(`用户 ${req.user.username} 保存了游戏数据`);
    
    res.json({ 
      success: true, 
      message: '游戏数据保存成功' 
    });
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

// 加载游戏数据
app.get('/api/load-game', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const data = gameData[userId];
    
    if (data) {
      console.log(`用户 ${req.user.username} 加载了游戏数据`);
      res.json({ 
        success: true,
        gameData: data 
      });
    } else {
      res.json({ 
        success: true,
        gameData: null,
        message: '没有找到存档数据' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: '加载失败' });
  }
});

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
  try {
    const leaderboard = Object.entries(gameData)
      .map(([userId, data]) => {
        const user = users.find(u => u.id == userId);
        return {
          username: user ? user.username : '未知用户',
          money: data.player ? data.player.money : 0,
          age: data.player ? data.player.age : 0,
          company: data.player ? data.player.company : '无'
        };
      })
      .sort((a, b) => b.money - a.money)  // 按金钱排序
      .slice(0, 10);  // 只取前10名
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取用户信息
app.get('/api/user-info', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});

// 根路径返回游戏页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功！`);
  console.log(`📱 游戏地址: http://localhost:${PORT}`);
  console.log(`🔧 API地址: http://localhost:${PORT}/api`);
  console.log(`\n可用的API接口:`);
  console.log(`POST /api/register - 用户注册`);
  console.log(`POST /api/login - 用户登录`);
  console.log(`POST /api/save-game - 保存游戏 (需要登录)`);
  console.log(`GET  /api/load-game - 加载游戏 (需要登录)`);
  console.log(`GET  /api/leaderboard - 排行榜`);
  console.log(`GET  /api/user-info - 用户信息 (需要登录)`);
});