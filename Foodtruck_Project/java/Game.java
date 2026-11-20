import java.util.*;
/** 학생은 이 파일을 수정하지 않습니다. 엔진이 공개한 관측값만 전달합니다. */
public final class Game {
 public record Task(String type, int start, int finish, int orderId) {}
 public record Worker(int id, Task task) {}
 public record Order(int id, int price, int cookTime, int quantity, String state) {}
 public record Customer(int id, int budget, double probability, double interest, int age, double x) {}
 public record Menu(int id, String name, int price, int cookTime) {}
 public record View(int now, int horizon, int truckId, int workload, int revenue, int escrow,
                    List<Worker> workers, List<Order> orderQueue, List<Order> cookQueue,
                    List<Customer> customers, List<Menu> menus, Map<String,Object> raw) {}
 public record Action(String type, Integer orderId) {
  public static Action keep(){return new Action("KEEP",null);}
  public static Action waitAction(){return new Action("WAIT",null);}
  public static Action promote(){return new Action("PROMOTE",null);}
  public static Action cook(int id){return new Action("COOK",id);}
  public static Action takeOrder(int id){return new Action("TAKE_ORDER",id);}
 }
 static int n(Map<String,Object> m,String k){return (int)d(m,k);}
 static double d(Map<String,Object> m,String k){Object x=m.get(k);return x instanceof Number?((Number)x).doubleValue():0;}
 static String s(Map<String,Object> m,String k){return Objects.toString(m.get(k),"");}
 @SuppressWarnings("unchecked") static Map<String,Object> map(Object o){return (Map<String,Object>)o;}
 @SuppressWarnings("unchecked") static List<Map<String,Object>> list(Map<String,Object> m,String k){return (List<Map<String,Object>>)m.get(k);}
 static List<Order> orders(Map<String,Object> m,String k){return list(m,k).stream().map(o->new Order(n(o,"id"),n(o,"price"),n(o,"cookTime"),n(o,"quantity"),s(o,"state"))).toList();}
 static View view(Map<String,Object> m){
  var ws=list(m,"workers").stream().map(w->{var t=w.get("task")==null?null:map(w.get("task"));return new Worker(n(w,"id"),t==null?null:new Task(s(t,"type"),n(t,"start"),n(t,"finish"),n(t,"orderId")));}).toList();
  var cs=list(m,"customers").stream().map(c->new Customer(n(c,"id"),n(c,"budget"),d(c,"probability"),d(c,"interest"),n(c,"age"),d(c,"x"))).toList();
  var ms=list(m,"menus").stream().map(o->new Menu(n(o,"id"),s(o,"name"),n(o,"price"),n(o,"cookTime"))).toList();
  return new View(n(m,"now"),n(m,"horizon"),n(m,"truckId"),n(m,"workload"),n(m,"revenue"),n(m,"escrow"),ws,orders(m,"orderQueue"),orders(m,"cookQueue"),cs,ms,Collections.unmodifiableMap(m));
 }
}
