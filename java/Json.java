import java.util.*;
final class Json {
 private final String s; private int i=0; Json(String s){this.s=s;}
 static Object parse(String s){Json p=new Json(s);Object v=p.value();p.ws();if(p.i!=s.length())throw new IllegalArgumentException("trailing JSON");return v;}
 void ws(){while(i<s.length()&&Character.isWhitespace(s.charAt(i)))i++;}
 char take(){if(i>=s.length())throw new IllegalArgumentException("unexpected end");return s.charAt(i++);}
 Object value(){ws();char c=take();
  if(c=='"')return str();
  if(c=='{'||c=='['){boolean obj=c=='{';Map<String,Object> m=new LinkedHashMap<>();List<Object>a=new ArrayList<>();ws();if(i<s.length()&&s.charAt(i)==(obj?'}':']')){i++;return obj?m:a;}while(true){ws();if(obj){if(take()!='"')throw new IllegalArgumentException("key");String k=str();ws();if(take()!=':')throw new IllegalArgumentException("colon");m.put(k,value());}else a.add(value());ws();char e=take();if(e==(obj?'}':']'))break;if(e!=',')throw new IllegalArgumentException("comma");}return obj?m:a;}
  int start=i-1;while(i<s.length()&&",]} \n\r\t".indexOf(s.charAt(i))<0)i++;String t=s.substring(start,i);return switch(t){case "true"->true;case "false"->false;case "null"->null;default->Double.valueOf(t);};
 }
 String str(){StringBuilder b=new StringBuilder();while(true){char c=take();if(c=='"')return b.toString();if(c=='\\'){c=take();b.append(switch(c){case 'n'->'\n';case 'r'->'\r';case 't'->'\t';case 'b'->'\b';case 'f'->'\f';case 'u'->{int x=Integer.parseInt(s.substring(i,i+4),16);i+=4;yield (char)x;}case '"','\\','/'->c;default->throw new IllegalArgumentException("escape");});}else b.append(c);}}
 static String quote(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r").replace("\t","\\t")+"\"";}
}
