#!/usr/bin/env bash
# 起（或重用）SonarQube、掃描當前專案，最後印出結果摘要與 dashboard URL。
# 用法：scripts/run-sonar.sh [PROJECT_KEY]
set -euo pipefail

CONTAINER="${SONAR_CONTAINER:-sonarqube-scan}"
IMAGE="${SONAR_IMAGE:-sonarqube:latest}"
SCANNER_IMAGE="${SONAR_SCANNER_IMAGE:-sonarsource/sonar-scanner-cli:latest}"
ADMIN_PW="${SONAR_ADMIN_PASSWORD:-SonarLocal2026!}"

PROJECT_KEY="${1:-}"
if [[ -z "$PROJECT_KEY" ]]; then
  PROJECT_KEY=$(sed -n 's/^sonar\.projectKey=//p' sonar-project.properties 2>/dev/null | head -1)
fi
: "${PROJECT_KEY:=$(basename "$PWD")}"

docker info >/dev/null 2>&1 || { echo "Docker daemon 沒開，先啟動 Docker Desktop" >&2; exit 1; }

pull_if_needed() {
  local img
  for img in "$@"; do
    if [[ "${SONAR_PULL:-0}" == "1" ]] || ! docker image inspect "$img" >/dev/null 2>&1; then
      echo ">> pull ${img} — 數 GB，會很久"
      docker pull "$img"
    fi
  done
}

wait_up() {
  echo -n ">> 等 SonarQube 就緒"
  local _
  for _ in $(seq 1 90); do
    if curl -s --max-time 5 "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; then
      echo " UP"; return 0
    fi
    echo -n "."; sleep 5
  done
  echo " 逾時"; docker logs --tail 30 "$CONTAINER"; return 1
}

[[ "${SONAR_RECREATE:-0}" == "1" ]] && docker rm -f "$CONTAINER" >/dev/null 2>&1

# 容器不存在時 docker inspect 仍會往 stdout 吐一個空行，直接 || echo missing 會拿到 "\nmissing"
STATE=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null | tr -d '[:space:]' || true)
: "${STATE:=missing}"
FRESH=0

if [[ "$STATE" == "missing" ]]; then
  pull_if_needed "$IMAGE" "$SCANNER_IMAGE"

  # 找空 port：9000 常被其他本機服務佔用。
  # 用 bash 內建的 /dev/tcp 而非 lsof——lsof 不一定存在，而 `! lsof ...` 會把
  # 「指令不存在」也算成 port 可用，於是選中被佔用的 port 讓 docker run 失敗。
  PORT=""
  for p in $(seq "${SONAR_PORT_FROM:-9000}" "${SONAR_PORT_TO:-9010}"); do
    if ! (exec 3<>/dev/tcp/127.0.0.1/"$p") 2>/dev/null; then PORT="$p"; break; fi
    exec 3<&- 3>&-
  done
  [[ -n "$PORT" ]] || { echo "${SONAR_PORT_FROM:-9000}-${SONAR_PORT_TO:-9010} 都被佔用" >&2; exit 1; }

  echo ">> 建立容器 $CONTAINER on port $PORT"
  # 綁 127.0.0.1：容器會一直留著，且預設 admin 密碼是公開的，
  # 不指定位址會發佈到所有介面，同網段的人就能存取並管理這台 SonarQube
  docker run -d --name "$CONTAINER" -p "127.0.0.1:$PORT:9000" \
    -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true "$IMAGE" >/dev/null
  FRESH=1
else
  pull_if_needed "$SCANNER_IMAGE"
  # port 必須從既有容器讀回來，不能重新探測——它自己正佔著那個 port
  PORT=$(docker port "$CONTAINER" 9000/tcp | head -1 | sed 's/.*://')
  [[ -n "$PORT" ]] || { echo "讀不到 $CONTAINER 的 port，用 SONAR_RECREATE=1 重建" >&2; exit 1; }
  if [[ "$STATE" != "running" ]]; then
    echo ">> 啟動既有容器 $CONTAINER on port $PORT"
    docker start "$CONTAINER" >/dev/null
  else
    echo ">> 重用執行中的 ${CONTAINER} on port ${PORT} — 歷史分析保留；要全新環境帶 SONAR_RECREATE=1"
  fi
fi

SONAR_URL="http://127.0.0.1:$PORT"
wait_up

# 只有全新容器的 admin 是 admin/admin 且首次登入強制改密碼；重用的容器再打這支會失敗
if [[ "$FRESH" == "1" ]]; then
  curl -sf -u admin:admin -X POST "$SONAR_URL/api/users/change_password" \
    -d login=admin --data-urlencode "previousPassword=admin" \
    --data-urlencode "password=$ADMIN_PW" >/dev/null
fi

AUTH="admin:$ADMIN_PW"
curl -s -u "$AUTH" "$SONAR_URL/api/authentication/validate" | grep -q '"valid":true' \
  || { echo "admin 密碼不符。容器可能是別的流程建的，帶 SONAR_ADMIN_PASSWORD 或 SONAR_RECREATE=1" >&2; exit 1; }

# 專案已存在會回錯誤，忽略即可
curl -s -u "$AUTH" -X POST "$SONAR_URL/api/projects/create" \
  -d "project=$PROJECT_KEY" --data-urlencode "name=$PROJECT_KEY" >/dev/null

TOKEN=$(curl -s -u "$AUTH" -X POST "$SONAR_URL/api/user_tokens/generate" \
  -d "name=scan-$$-$(date +%s)" -d type=PROJECT_ANALYSIS_TOKEN -d "projectKey=$PROJECT_KEY" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || { echo "token 產生失敗" >&2; exit 1; }

# scanner 與 server 共用網路，所以這裡的 9000 是「容器內」的 port，與上面的 $PORT 無關
echo ">> 掃描中（數分鐘）"
docker run --rm --network "container:$CONTAINER" \
  -v "$PWD:/usr/src" -w /usr/src -e SONAR_TOKEN="$TOKEN" \
  "$SCANNER_IMAGE" sonar-scanner \
  -Dsonar.host.url=http://127.0.0.1:9000 -Dsonar.projectKey="$PROJECT_KEY"

# 掃描上傳完不代表算完，要等 server 端 Compute Engine 消化完才有 Quality Gate
echo -n ">> 等 server 端運算"
for _ in $(seq 1 60); do
  st=$(curl -s -u "$AUTH" "$SONAR_URL/api/ce/component?component=$PROJECT_KEY" \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print('PENDING' if d.get('queue') else d.get('current',{}).get('status','NONE'))")
  case "$st" in
    SUCCESS) echo " 完成"; break ;;
    FAILED|CANCELED) echo " 失敗：$st"; exit 1 ;;
  esac
  echo -n "."; sleep 5
done
# 迴圈跑完沒等到 SUCCESS 就不能往下印摘要，否則會把還沒算完的結果當成掃描成功
[[ "$st" == "SUCCESS" ]] || { echo " 逾時（最後狀態：$st）"; exit 1; }

echo
# 評等讀 software_quality_*（MQR mode，SonarQube 26 預設，也是網頁顯示的值）；
# standard mode 的 security_rating 等指標同一次掃描可能給出不同字母
curl -s -u "$AUTH" "$SONAR_URL/api/measures/component?component=$PROJECT_KEY&metricKeys=alert_status,violations,software_quality_security_rating,software_quality_reliability_rating,software_quality_maintainability_rating,coverage,duplicated_lines_density,security_hotspots,ncloc" \
  | python3 -c "
import json,sys
r={'1.0':'A','2.0':'B','3.0':'C','4.0':'D','5.0':'E'}
m={x['metric']:x.get('value') for x in json.load(sys.stdin)['component']['measures']}
g=lambda k: r.get(m.get(k),m.get(k,'-'))
print(f\"  Quality Gate : {m.get('alert_status')}\")
print(f\"  Issues       : {m.get('violations')}  (security {g('software_quality_security_rating')} / reliability {g('software_quality_reliability_rating')} / maintainability {g('software_quality_maintainability_rating')})\")
print(f\"  Coverage     : {m.get('coverage')}%   Duplications: {m.get('duplicated_lines_density')}%   Hotspots: {m.get('security_hotspots')}\")
print(f\"  Lines of code: {m.get('ncloc')}\")"

cat <<EOF

  Dashboard : $SONAR_URL/dashboard?id=$PROJECT_KEY
  帳號      : admin / $ADMIN_PW
EOF
