import java.util.*;
/** 이 파일의 choose만 수정합니다. 한 번 호출될 때 두 직원의 다음 행동을 반환합니다.
 * 진행 중인 작업은 KEEP. 같은 작업 종류에 두 직원을 동시에 배치할 수 없습니다.
 * 매 경기 새 객체/프로세스에서 시작합니다. 출력은 System.err.println을 쓰세요.
 */
public class MyStrategy {

  //남은 시간 안에서 총매출이 최대인 주문 조합 탐색
private Game.Order selectBestCookOrder(List<Game.Order> orders, int remaining) {

    if (remaining <= 0 || orders.isEmpty()) {
        return null;
    }

    int n = orders.size();
    int[][] dp = new int[n + 1][remaining + 1];

    //제조시간 제한 안에서 매출 최대화 조합 찾기
    for (int i = 1; i <= n; i++) {
        Game.Order order = orders.get(i - 1);
        int time = order.cookTime();
        int price = order.price();

        for (int t = 0; t <= remaining; t++) {
            dp[i][t] = dp[i - 1][t];

            if (time > 0 && time <= t) {
                dp[i][t] = Math.max(
                    dp[i][t],
                    dp[i - 1][t - time] + price
                );
            }
        }
    }

    // 최적 조합에 포함된 주문 중 하나를 선택
    int t = remaining;
    Game.Order selected = null;

    for (int i = n; i >= 1; i--) {
        Game.Order order = orders.get(i - 1);
        int time = order.cookTime();

        if (time > 0 && time <= t
                && dp[i][t] > dp[i - 1][t]) {

            // 조합에 포함된 주문 중 제조시간이 짧은 주문 우선
            if (selected == null
                    || time < selected.cookTime()) {
                selected = order;
            }

            t -= time;
        }
    }

    return selected;
}

  public Game.Action[] choose(Game.View view) {

  Game.Action[] plan = new Game.Action[2];
  Set<String> busy = new HashSet<>();

  for(int i=0;i<2;i++) {
   var task=view.workers().get(i).task();
   plan[i]=task==null?Game.Action.waitAction():Game.Action.keep();
   if(task!=null)busy.add(task.type());
  }

  // TODO: 제조 순서, 주문 접수 여부, 홍보 시점, 마감 판단을 바꿔 보세요.
  for(int i=0;i<2;i++) {
   if(!plan[i].type().equals("WAIT"))
        continue;

    int remaining = view.horizon() - view.now();

   if (!view.cookQueue().isEmpty() && !busy.contains("COOK")) {

        Game.Order bestOrder = selectBestCookOrder(view.cookQueue(), remaining);

        if (bestOrder != null) {
            plan[i] = Game.Action.cook(bestOrder.id());
            busy.add("COOK");
        }
}

    else if(!view.orderQueue().isEmpty()&&!busy.contains("TAKE_ORDER")) {
    plan[i]=Game.Action.takeOrder(view.orderQueue().get(0).id());
    busy.add("TAKE_ORDER");
   } else if(!busy.contains("PROMOTE")&&view.now()+4<view.horizon()) {
    plan[i]=Game.Action.promote();
    busy.add("PROMOTE");
   }
  }
  return plan;
 }
}
