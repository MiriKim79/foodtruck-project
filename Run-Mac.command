#!/bin/bash
cd "$(dirname "$0")" || exit 1
finish() {
  if [ -t 0 ]; then printf '\n종료하려면 Enter를 누르세요.'; read -r _; fi
  exit "$1"
}
if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js 18 이상을 설치하고 터미널에서 node --version을 확인하세요.\n'; finish 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  printf 'Node.js 18 이상이 필요합니다.\n'; finish 1
fi
if ! command -v java >/dev/null 2>&1 || ! java --list-modules 2>/dev/null | grep -Eq '^jdk.compiler@(1[7-9]|[2-9][0-9])([.]|$)'; then
  printf 'JDK 17 이상(컴파일러 포함)이 필요합니다. java --version과 PATH 설정을 확인하세요.\n'; finish 1
fi
node run.js "$@"
status=$?
if [ "$status" -eq 0 ]; then
  if ! open results/game.html; then
    printf '경기 계산은 완료됐지만 브라우저를 열지 못했습니다. results/game.html을 직접 열어 주세요.\n'
    status=1
  fi
fi
finish "$status"
