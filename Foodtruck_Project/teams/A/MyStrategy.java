import java.util.*;
/** 이 파일의 choose만 수정합니다. 한 번 호출될 때 두 직원의 다음 행동을 반환합니다.
 * 진행 중인 작업은 KEEP. 같은 작업 종류에 두 직원을 동시에 배치할 수 없습니다.
 * 매 경기 새 객체/프로세스에서 시작합니다. 출력은 System.err.println을 쓰세요.
 */
public class MyStrategy {
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
   if(!plan[i].type().equals("WAIT"))continue;
   if(!view.cookQueue().isEmpty()&&!busy.contains("COOK")) {
    plan[i]=Game.Action.cook(view.cookQueue().get(0).id());busy.add("COOK");
   } else if(!view.orderQueue().isEmpty()&&!busy.contains("TAKE_ORDER")) {
    plan[i]=Game.Action.takeOrder(view.orderQueue().get(0).id());busy.add("TAKE_ORDER");
   } else if(!busy.contains("PROMOTE")&&view.now()+4<view.horizon()) {
    plan[i]=Game.Action.promote();busy.add("PROMOTE");
   }
  }
  return plan;
 }
}
