// 后端API配置
const API_BASE_URL = 'http://localhost:3000/api';

// API调用工具函数
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

// 用户认证相关
class AuthManager {
  static isLoggedIn() {
    return !!localStorage.getItem('authToken');
  }
  
  static getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }
  
  static setAuthData(token, user) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
  
  static logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    location.reload(); // 刷新页面
  }
  
  static async register(username, password) {
    const result = await apiCall('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (result.success) {
      this.setAuthData(result.token, result.user);
    }
    
    return result;
  }
  
  static async login(username, password) {
    const result = await apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (result.success) {
      this.setAuthData(result.token, result.user);
    }
    
    return result;
  }
}

// 游戏数据管理
class GameDataManager {
  static async saveGame() {
    if (!AuthManager.isLoggedIn()) {
      throw new Error('请先登录');
    }
    
    const gameState = {
      player: player,
      gameDate: gameDate.toISOString(),
      playerItems: playerItems || [],
      hasPerfectAttendance: hasPerfectAttendance,
      absentDays: absentDays,
      currentChanges: currentChanges || {}
    };
    
    return await apiCall('/save-game', {
      method: 'POST',
      body: JSON.stringify(gameState)
    });
  }
  
  static async loadGame() {
    if (!AuthManager.isLoggedIn()) {
      throw new Error('请先登录');
    }
    
    const result = await apiCall('/load-game');
    
    if (result.success && result.gameData) {
      // 恢复游戏状态
      const data = result.gameData;
      player = data.player;
      gameDate = new Date(data.gameDate);
      playerItems = data.playerItems || [];
      hasPerfectAttendance = data.hasPerfectAttendance !== false;
      absentDays = data.absentDays || 0;
      currentChanges = data.currentChanges || {};
      
      // 更新界面
      updateStatusBox();
      updateItemsDisplay();
      
      return true;
    }
    
    return false;
  }
  
  static async getLeaderboard() {
    return await apiCall('/leaderboard');
  }
}

// 界面管理
function showLoginRegisterDialog() {
  if (AuthManager.isLoggedIn()) {
    showUserMenu();
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="width: 300px;">
      <h3>登录/注册</h3>
      <div style="margin: 20px 0;">
        <input type="text" id="username" placeholder="用户名" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ddd;">
        <input type="password" id="password" placeholder="密码" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ddd;">
      </div>
      <div class="modal-buttons">
        <button onclick="handleLogin()" style="margin-right: 10px;">登录</button>
        <button onclick="handleRegister()" style="margin-right: 10px;">注册</button>
        <button onclick="closeAuthModal()">取消</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function showUserMenu() {
  const user = AuthManager.getCurrentUser();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>用户中心</h3>
      <p>欢迎, ${user.username}!</p>
      <div class="modal-buttons" style="margin-top: 20px;">
        <button onclick="saveGameToServer()">保存游戏</button>
        <button onclick="loadGameFromServer()">加载游戏</button>
        <button onclick="showLeaderboard()">排行榜</button>
        <button onclick="AuthManager.logout()" style="background: #dc3545;">退出登录</button>
        <button onclick="closeUserMenu()">关闭</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function showLeaderboard() {
  GameDataManager.getLeaderboard().then(result => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="width: 400px;">
        <h3>💰 财富排行榜</h3>
        <div style="text-align: left; margin: 20px 0;">
          ${result.leaderboard.map((player, index) => `
            <div style="padding: 8px; border-bottom: 1px solid #eee; ${index < 3 ? 'background: #fff3cd;' : ''}">
              <span style="font-weight: bold;">#${index + 1}</span>
              ${player.username} - 
              <span style="color: #28a745;">💰${player.money}元</span>
              (${player.age}岁, ${player.company})
            </div>
          `).join('')}
        </div>
        <button onclick="closeLeaderboard()">关闭</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }).catch(error => {
    showGamePopup("错误", "获取排行榜失败: " + error.message);
  });
}

// 事件处理函数
async function handleLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    alert('请输入用户名和密码');
    return;
  }
  
  try {
    await AuthManager.login(username, password);
    closeAuthModal();
    showGamePopup("登录成功", `欢迎回来, ${username}!`);
    
    // 尝试加载游戏数据
    const loaded = await GameDataManager.loadGame();
    if (loaded) {
      showGamePopup("加载成功", "已恢复您的游戏进度");
    }
  } catch (error) {
    alert('登录失败: ' + error.message);
  }
}

async function handleRegister() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    alert('请输入用户名和密码');
    return;
  }
  
  if (password.length < 6) {
    alert('密码至少需要6位');
    return;
  }
  
  try {
    await AuthManager.register(username, password);
    closeAuthModal();
    showGamePopup("注册成功", `欢迎加入北漂大军, ${username}!`);
  } catch (error) {
    alert('注册失败: ' + error.message);
  }
}

async function saveGameToServer() {
  try {
    await GameDataManager.saveGame();
    showGamePopup("保存成功", "游戏数据已保存到云端");
    closeUserMenu();
  } catch (error) {
    showGamePopup("保存失败", error.message);
  }
}

async function loadGameFromServer() {
  try {
    const loaded = await GameDataManager.loadGame();
    if (loaded) {
      showGamePopup("加载成功", "已恢复您的游戏进度");
    } else {
      showGamePopup("提示", "没有找到云端存档");
    }
    closeUserMenu();
  } catch (error) {
    showGamePopup("加载失败", error.message);
  }
}

// 关闭弹窗函数
function closeAuthModal() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
}

function closeUserMenu() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
}

function closeLeaderboard() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
  // 如果用户已登录，自动加载游戏数据
  if (AuthManager.isLoggedIn()) {
    GameDataManager.loadGame().catch(error => {
      console.log('自动加载游戏数据失败:', error.message);
    });
  }
});