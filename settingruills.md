# 오라클 클라우드부터 도커 배포까지의 전체 가이드

이 문서는 Oracle Cloud Infrastructure (OCI) 가상 머신(VM) 생성부터, 서버 설정, Docker 환경 구축, 그리고 최종적으로 이 프로젝트(`levyplay`)를 배포하는 전체 과정을 단계별로 설명합니다.

---

## 1. **오라클 클라우드 (Oracle Cloud) 인스턴스 생성**

### 1-1. VM 인스턴스 만들기
1.  **Oracle Cloud 접속**: 로그인 후 'Compute' > 'Instances' 메뉴로 이동합니다.
2.  **인스턴스 생성 (Create Instance)**:
    -   **Name**: `levyplay-instance` 등 알아보기 쉬운 이름 입력.
    -   **Placement**: 기본값 유지.
    -   **Image (운영체제)**: **Canonical Ubuntu 22.04 (Minimal)** 또는 **Oracle Linux 9**를 추천합니다. (Ubuntu가 Docker 설정이 더 직관적일 수 있습니다.)
    -   **Shape (CPU/RAM)**:
        -   **추천**: 'Change Shape' 클릭 -> 'Ampere' (VM.Standard.A1.Flex)
        -   스펙: OCPUs 4개, Memory 24GB (Free Tier에서 최대로 사용할 수 있는 고성능 스펙)
    -   **Networking**: 'Create a new VCN' 선택 (기본값).
    -   **SSH Keys**:
        -   'Save Private Key'를 눌러 `.key` 파일을 반드시 저장합니다. (분실 시 접속 불가)

### 1-2. 방화벽 설정 (Port Open)
Docker 컨테이너가 사용할 포트(예: 3001)와 SSH 접속을 위해 방화벽을 열어야 합니다.
1.  생성된 인스턴스 상세 페이지에서 'Subnet' 링크를 클릭합니다.
2.  'Security Lists' -> 'Default Security List via...'를 클릭합니다.
3.  'Add Ingress Rules' 버튼 클릭:
    -   **Source CIDR**: `0.0.0.0/0` (모든 곳에서 접속 허용)
    -   **IP Protocol**: TCP
    -   **Destination Port Range**: `3001` (Dashboard 서버 포트), `80`, `443` 등 필요한 포트 입력.
4.  **Ubuntu 내부 방화벽 해제** (나중에 터미널 접속 후 실행):
    ```bash
    sudo iptables -F
    sudo netfilter-persistent save
    ```

---

## 2. **서버 접속 및 초기 설정**

### 2-1. SSH 접속
로컬 PC(Git Bash, PowerShell, Terminal 등)에서 아래 명령어로 접속합니다.
```bash
# 권한 설정 (최초 1회, Mac/Linux만)
chmod 400 "path/to/private.key"

# 접속 (IP는 오라클 클라우드 인스턴스 화면의 Public IP 확인)
ssh -i "path/to/private.key" ubuntu@<PUBLIC_IP_ADDRESS>
```

### 2-2. 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. **Docker 설치 및 설정**

### 3-1. Docker 설치
```bash
# 필수 패키지 설치
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# GPG 키 및 저장소 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 엔진 설치
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y
```

### 3-2. 권한 설정 (sudo 없이 Docker 사용)
```bash
sudo usermod -aG docker $USER
# 로그아웃 후 다시 접속해야 적용됨
exit
ssh -i "path/to/private.key" ubuntu@<PUBLIC_IP_ADDRESS>
```

---

## 4. **프로젝트 배포 (Docker Build & Run)**

### 4-1. 프로젝트 파일 업로드
Github를 통해 받거나, SCP 명령어로 로컬 파일을 서버로 전송합니다.
**방법 A: Github Clone** (추천)
```bash
git clone https://github.com/<YOUR_GITHUB_ID>/levyplay.git
cd levyplay
```

**방법 B: 로컬 파일 직접 전송**
```bash
# 로컬 PC 터미널에서 실행
scp -i "key.key" -r ./levyplay ubuntu@<IP>:~/levyplay
```

### 4-2. Docker 이미지 빌드
Dockerfile이 있는 위치에서 이미지를 생성합니다.
(현재 프로젝트는 `mcr.microsoft.com/playwright:v1.56.1-jammy` 이미지를 베이스로 사용합니다.)

```bash
# 이미지 이름: levyplay-app
docker build -t levyplay-app .
```
> **참고**: Ampere(ARM) 인스턴스를 사용하는 경우, Playwright 베이스 이미지가 `linux/amd64` 전용일 수 있습니다. 이 경우 `--platform linux/amd64` 옵션이 필요할 수 있으나, 성능 저하가 발생할 수 있으므로 x86_64(AMD) 인스턴스를 사용하는 것이 Playwright에는 더 안정적입니다.

### 4-3. Docker 컨테이너 실행
```bash
# 백그라운드(-d) 실행, 포트 매핑(-p 3001:3001)
docker run -d -p 3001:3001 --name my-dashboard levyplay-app
```

### 4-4. 로그 확인 및 접속 테스트
```bash
# 실행 로그 확인
docker logs -f my-dashboard
```
브라우저 주소창에 `http://<PUBLIC_IP>:3001` 입력하여 접속 확인.

---

## 5. **CI/CD 자동화 (선택 사항: GitHub Actions 연동)**

GitHub에 코드를 푸시할 때마다 자동으로 배포되게 하려면:

1.  **Dockerfile**: 현재 작성된 `Dockerfile` 사용.
2.  **Workflow**: `.github/workflows/deploy.yml` 생성.
3.  **Self-hosted Runner**: 오라클 클라우드 VM을 GitHub Runner로 등록하거나, SSH Action을 통해 배포 명령 전달.

### 예시 배포 스크립트 (SSH 접속 방식)
```yaml
name: Deploy to Oracle Cloud
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy using SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.ORACLE_HOST }}
          username: ubuntu
          key: ${{ secrets.ORACLE_SSH_KEY }}
          script: |
            cd ~/levyplay
            git pull origin main
            docker build -t levyplay-app .
            docker stop levyplay-container || true
            docker rm levyplay-container || true
            docker run -d -p 3001:3001 --name levyplay-container levyplay-app
```
