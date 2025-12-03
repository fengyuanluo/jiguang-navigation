# VPS 部署指南

这份指南将指导你如何将当前项目部署到你的 Linux VPS 上进行测试。

## 1. 准备工作

### 本地电脑 (Windows)
确保你已经安装了以下工具（Windows 10/11 自带）：
- `ssh` (用于登录 VPS)
- `scp` (用于传输文件)
- `tar` 或 `zip` (用于打包文件)

### 远程 VPS (Linux)
确保你的 VPS 已经安装了 Docker 和 Docker Compose。
如果未安装，可以在 VPS 上运行以下命令一键安装（以 Ubuntu/Debian 为例）：

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker 并设置开机自启
sudo systemctl enable --now docker

# 安装 Docker Compose (如果 Docker 版本较新，通常已包含 docker compose 插件)
# 验证安装
docker compose version
```

---

## 2. 打包项目 (在本地操作)

在项目根目录 (`c:\Users\FM222\Desktop\dhweb\jg`) 打开 PowerShell 或终端。

为了避免传输不必要的大文件（如 `node_modules`），我们需要手动打包核心文件。

运行以下命令创建压缩包 `jg-app.tar.gz`：

```powershell
# 排除 node_modules, .next, .git 等文件夹进行打包
tar -czvf jg-app.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude=data --exclude=uploads .
```

*注意：如果你没有 `tar` 命令，也可以手动选中除了 `node_modules`, `.next`, `.git`, `data`, `uploads` 之外的所有文件，右键 -> 发送到 -> 压缩(zipped)文件夹，命名为 `jg-app.zip`。*

---

## 3. 上传到 VPS (在本地操作)

假设你的 VPS 信息如下（请替换为实际信息）：
- **IP**: `1.2.3.4`
- **用户名**: `root`
- **目标路径**: `/opt/jg-app`

运行以下命令上传文件：

```powershell
# 如果是 tar.gz
scp jg-app.tar.gz root@1.2.3.4:/root/

# 如果是 zip
scp jg-app.zip root@1.2.3.4:/root/
```

---

## 4. 在 VPS 上部署 (在 VPS 操作)

1.  **登录 VPS**:
    ```bash
    ssh root@1.2.3.4
    ```

2.  **创建目录并解压**:
    ```bash
    # 创建部署目录
    mkdir -p /opt/jg-app
    
    # 移动压缩包到目录
    mv jg-app.tar.gz /opt/jg-app/
    # 或者 mv jg-app.zip /opt/jg-app/
    
    # 进入目录
    cd /opt/jg-app
    
    # 解压 (如果是 tar.gz)
    tar -xzvf jg-app.tar.gz
    
    # 解压 (如果是 zip，需要先安装 unzip: apt install unzip)
    # unzip jg-app.zip
    ```

3.  **启动服务**:
    ```bash
    docker compose up -d
    ```

4.  **查看状态**:
    ```bash
    docker compose ps
    ```
    如果状态显示 `Up`，说明启动成功。
    如果 `PORTS` 栏为空，或者状态是 `Restarting`，请查看日志。

5.  **查看日志 (如果启动失败)**:
    ```bash
    docker compose logs -f
    ```

---

## 5. 访问测试

打开浏览器访问：`http://<你的VPS_IP>:2266`

### 默认账号
- **用户名**: `admin`
- **密码**: `123456`

---

## 6. 常见问题与排查

### 容器反复重启 / Ports 为空
这通常是权限问题导致的。
1.  查看日志：`docker compose logs web`
2.  如果看到 "Permission denied" 或数据库相关错误，尝试赋予数据目录权限：
    ```bash
    chmod -R 777 data uploads
    docker compose restart
    ```
    *(注：最新版本的 Dockerfile 已调整为 root 运行以避免此问题，请确保重新构建：`docker compose up -d --build`)*

### 端口无法访问
1.  检查 VPS 防火墙是否放行了 2266 端口。
    ```bash
    # Ubuntu (UFW)
    ufw allow 2266/tcp
    ```
2.  检查云服务商（如阿里云、腾讯云、AWS）的安全组设置，确保入站规则允许 2266 端口。

---

## 7. 后续更新

如果你修改了代码，需要更新部署：

1.  本地重新打包 (`tar` 或 `zip`)。
2.  上传覆盖 VPS 上的压缩包。
3.  在 VPS 上解压覆盖。
4.  运行构建并重启：
    ```bash
    cd /opt/jg-app
    docker compose up -d --build
    ```
