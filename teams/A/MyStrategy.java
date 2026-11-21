import java.util.*;

/** 정승빈: 홍보·혼잡도 대응 및 직원 배치 실험 전략. */
public class MyStrategy {
    public Game.Action[] choose(Game.View view) {
        Game.Action[] plan = new Game.Action[2];
        Set<String> busy = new HashSet<String>();

        // 진행 중인 작업은 유지하고, 같은 작업 구역의 중복 배치를 막는다.
        for (int i = 0; i < 2; i++) {
            Game.Task task = view.workers().get(i).task();
            if (task == null) {
                plan[i] = Game.Action.waitAction();
            } else {
                plan[i] = Game.Action.keep();
                busy.add(task.type());
            }
        }

        String traffic = String.valueOf(view.raw().get("trafficLevel"));
        int promotionLimit = 60; // 보통 또는 혼잡도 정보가 없을 때
        if (traffic.equals("quiet")) {
            promotionLimit = 40;
        } else if (traffic.equals("busy")) {
            promotionLimit = 80;
        }

        // 홍보 효과 범위 안에 관심도를 더 높일 수 있는 고객이 있는지 확인한다.
        double truckX = view.truckId() == 0 ? 300 : 900;
        boolean hasTarget = false;
        for (Game.Customer customer : view.customers()) {
            if (Math.abs(customer.x() - truckX) <= 220 && customer.interest() < 4) {
                hasTarget = true;
                break;
            }
        }
        boolean canPromote = hasTarget && view.workload() < promotionLimit
                && view.now() + 4 < view.horizon();

        // 제조와 접수는 기존 FCFS를 유지한다. 두 작업 후 남는 직원만 홍보한다.
        for (int i = 0; i < 2; i++) {
            if (!plan[i].type().equals("WAIT")) {
                continue;
            }
            if (!view.cookQueue().isEmpty() && !busy.contains("COOK")) {
                plan[i] = Game.Action.cook(view.cookQueue().get(0).id());
                busy.add("COOK");
            } else if (!view.orderQueue().isEmpty() && !busy.contains("TAKE_ORDER")) {
                plan[i] = Game.Action.takeOrder(view.orderQueue().get(0).id());
                busy.add("TAKE_ORDER");
            } else if (canPromote && !busy.contains("PROMOTE")) {
                plan[i] = Game.Action.promote();
                busy.add("PROMOTE");
            }
        }
        return plan;
    }
}
