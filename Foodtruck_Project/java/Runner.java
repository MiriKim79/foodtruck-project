import java.io.*;
import java.nio.charset.StandardCharsets;
public class Runner {
 public static void main(String[] args)throws Exception{
  PrintStream protocol=System.out;System.setOut(System.err);
  MyStrategy strategy=new MyStrategy();
  protocol.println("READY");
  try(var input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8))){String line;while((line=input.readLine())!=null){
   try{Game.Action[] actions=strategy.choose(Game.view(Game.map(Json.parse(line))));
    if(actions==null||actions.length!=2)throw new IllegalArgumentException("직원 2명의 행동이 필요합니다");
    String[] values=new String[2];for(int j=0;j<2;j++){var a=actions[j];values[j]="{\"type\":"+Json.quote(a.type())+(a.orderId()==null?"":",\"orderId\":"+a.orderId())+"}";}protocol.println("["+String.join(",",values)+"]");
   }catch(Throwable e){System.err.println(e);protocol.println("{\"error\":\"JAVA_STRATEGY_ERROR\"}");}
  }}
 }
}
