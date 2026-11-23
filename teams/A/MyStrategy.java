import java.util.*;
/** 통합 전략: 접수 마감 판단(PR #3) + 제조 선택 FCFS/SJF/DP(PR #4) + 선택적 홍보 상한(PR #2).
 * 진행 중인 작업은 KEEP. 같은 작업 종류에 두 직원을 동시에 배치할 수 없습니다.
 * 매 경기 새 객체/프로세스에서 시작합니다. 출력은 System.err.println을 쓰세요.
 */
public class MyStrategy {
 // ===== 실험 설정 (독립적으로 변경 가능) =====
 /** true: 짧은 주문 우선 + 정밀 마감 판단(PR #3). false: 접수 대기열 맨 앞 주문(기존). */
 static final boolean ORDER_GATE = false;
 /** "FCFS": 제조 대기열 맨 앞(기존), "SJF": 제조시간 최단, "DP": 남은 시간 내 매출 최대 조합(PR #4). */
 static final String COOK_MODE = "DP";
 /** true: 혼잡도별 작업량 상한 + 홍보 대상 고객 확인(PR #2). false: 기존 홍보. */
 static final boolean PROMOTION_LIMIT = false;
 /** 마감 직전 홍보 중단 여유. now + PROMO_END_MARGIN < horizon 일 때만 홍보. 4 = 기존 동작. */
 static final int PROMO_END_MARGIN = 4;
 static final int TAKE_TICKS = 2;

 public Game.Action[] choose(Game.View view) {
  Game.Action[] plan = new Game.Action[2];
  Set<String> busy = new HashSet<>();
  for(int i=0;i<2;i++) {
   var task=view.workers().get(i).task();
   plan[i]=task==null?Game.Action.waitAction():Game.Action.keep();
   if(task!=null)busy.add(task.type());
  }
  Game.Order cookPick = pickCook(view);
  Game.Order orderPick = pickOrder(view);
  boolean canPromote = canPromote(view);
  // 우선순위: 제조 > 접수 > 홍보. 후보가 없으면 다음 작업으로 넘어간다.
  for(int i=0;i<2;i++) {
   if(!plan[i].type().equals("WAIT"))continue;
   if(cookPick!=null&&!busy.contains("COOK")) {
    plan[i]=Game.Action.cook(cookPick.id());busy.add("COOK");
   } else if(orderPick!=null&&!busy.contains("TAKE_ORDER")) {
    plan[i]=Game.Action.takeOrder(orderPick.id());busy.add("TAKE_ORDER");
   } else if(canPromote&&!busy.contains("PROMOTE")) {
    plan[i]=Game.Action.promote();busy.add("PROMOTE");
   }
  }
  return plan;
 }

 /** 마감(horizon)까지 남은 틱. 제조는 horizon 시각에 끝나도 확정 매출에 포함된다. */
 private int remaining(Game.View view) { return view.horizon()-view.now(); }

 /** 제조할 주문. 없으면 null(다른 작업으로 전환). */
 private Game.Order pickCook(Game.View view) {
  List<Game.Order> q = view.cookQueue();
  if(q.isEmpty()) return null;
  switch(COOK_MODE) {
   case "SJF": {
    Game.Order best = null;
    for(Game.Order o : q) if(o.cookTime()<=remaining(view)&&(best==null||o.cookTime()<best.cookTime())) best=o;
    return best;
   }
   case "DP": return dpCook(q, remaining(view));
   default: return q.get(0);
  }
 }

 /** PR #4: 남은 시간(용량) 안에서 가격 합이 최대인 조합을 구하고, 그 조합에서 제조시간이 짧은 주문을 먼저 제조. */
 private Game.Order dpCook(List<Game.Order> orders, int remaining) {
  if(remaining<=0||orders.isEmpty()) return null;
  int n=orders.size();
  int[][] dp=new int[n+1][remaining+1];
  for(int i=1;i<=n;i++) {
   Game.Order o=orders.get(i-1);
   int time=o.cookTime(), price=o.price();
   for(int t=0;t<=remaining;t++) {
    dp[i][t]=dp[i-1][t];
    if(time>0&&time<=t) dp[i][t]=Math.max(dp[i][t],dp[i-1][t-time]+price);
   }
  }
  int t=remaining;
  Game.Order selected=null;
  for(int i=n;i>=1;i--) {
   Game.Order o=orders.get(i-1);
   int time=o.cookTime();
   if(time>0&&time<=t&&dp[i][t]>dp[i-1][t]) {
    if(selected==null||time<selected.cookTime()) selected=o;
    t-=time;
   }
  }
  return selected;
 }

 /** 접수할 주문. 없으면 null. ORDER_GATE가 켜져 있으면 PR #3 방식. */
 private Game.Order pickOrder(Game.View view) {
  List<Game.Order> q = view.orderQueue();
  if(q.isEmpty()) return null;
  if(!ORDER_GATE) return q.get(0);
  // 남은 제조 시간 = 제조 대기 주문 합 + 제조 중인 주문의 남은 시간
  int backlog=0;
  for(Game.Order c : view.cookQueue()) backlog+=c.cookTime();
  for(Game.Worker w : view.workers()) {
   var t=w.task();
   if(t!=null&&t.type().equals("COOK")) backlog+=t.finish()-view.now();
  }
  Game.Order pick=q.get(0);
  for(Game.Order o : q) if(o.cookTime()<pick.cookTime()) pick=o;
  // 접수(2틱)와 제조는 다른 직원이 병렬로 진행하므로 둘 중 늦게 끝나는 쪽이 제조 시작 시각이다.
  // 마감 시각(horizon)에 완료되는 제조는 확정 매출에 포함된다.
  if(view.now()+Math.max(TAKE_TICKS,backlog)+pick.cookTime()>view.horizon()) return null;
  return pick;
 }

 /** 홍보 가능 여부. PROMOTION_LIMIT가 켜져 있으면 PR #2 조건 추가. */
 private boolean canPromote(Game.View view) {
  if(!(view.now()+PROMO_END_MARGIN<view.horizon())) return false;
  if(!PROMOTION_LIMIT) return true;
  String traffic=String.valueOf(view.raw().get("trafficLevel"));
  int limit=60; // 보통 또는 혼잡도 정보가 없을 때
  if(traffic.equals("quiet")) limit=40; else if(traffic.equals("busy")) limit=80;
  double truckX=view.truckId()==0?300:900;
  boolean hasTarget=false;
  for(Game.Customer c : view.customers()) {
   if(Math.abs(c.x()-truckX)<=220&&c.interest()<4){hasTarget=true;break;}
  }
  return hasTarget&&view.workload()<limit;
 }
}
