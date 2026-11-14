---
title: C++模板使用例子
author: 52coder
pubDatetime: 2017-02-15T15:33:05.569Z
modDatetime: 2026-11-08T00:00:00+08:00
slug: cpp_template
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: 用四个可编译的小例子理解 C++ 可变参数模板：参数包如何展开，递归何时停止，以及怎样逐项打印 tuple。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 从接收一个参数，到接收一组参数

`void print(int n)` 只能接收一个整数。如果希望同一个函数依次打印 `7.5`、`"hello"` 和 `42`，参数的数量和类型都不固定，就可以用可变参数模板。

`typename... Types` 声明一组类型，`Types... args` 声明对应的一组参数。这组参数叫“参数包”。下面四个例子都采用“处理一个，再处理剩下的”这一思路。每个例子都有自己的 `main`，需要分别保存、编译；可用 `c++ -std=c++17 example.cpp -o example`。

## 例子一：每次取出一个参数

```cpp
#include <iostream>
#include <bitset>
using namespace std;

void printX(){

}

template<typename T,typename... Types>
void printX(const T& firstArg,const Types&... args)
{
    cout <<firstArg<<",sizeof(args):"<<sizeof...(args)<< endl;
    printX(args...);
}

int main(){
    printX(7.5,"hello",bitset<16>(377),42);
    return 0;
}
```

运行结果：

```
7.5,sizeof(args):3
hello,sizeof(args):2
0000000101111001,sizeof(args):1
42,sizeof(args):0
```

第一次调用时，`firstArg` 是 `7.5`，`args` 里还有三个参数。打印完 `7.5`，`printX(args...)` 把剩下的三个参数继续传入函数。下一次取出 `"hello"`，再下一次取出 `bitset`，直到最后的 `42`。

`sizeof...(args)` 统计剩余参数的个数，不是它们占用的字节数。最后一次递归传入零个参数，由空函数 `printX()` 接住。

如果我们不定义没有参数的printX会有如下报错：

```
note: candidate function template not viable: requires at least argument 'firstArg', but no arguments were provided
void printX(const T& firstArg,const Types&... args)
```

## 例子二：用参数依次填入占位符

再加一点用途：让每个参数替换格式串中的一个 `%`，`%%` 则输出百分号。这里自定义的是简化规则，没有实现 `printf` 的 `%d`、宽度和精度选项，重点仍是参数包递归。

```cpp
#include <iostream>
#include <stdexcept>

void printX(const char* format) {
    while (*format) {
        if (*format == '%') {
            if (format[1] != '%') {
                throw std::invalid_argument("missing argument");
            }
            ++format;
        }
        std::cout << *format++;
    }
}

template<typename T, typename... Args>
void printX(const char* format, const T& value, const Args&... args) {
    while (*format) {
        if (*format == '%') {
            if (format[1] == '%') {
                std::cout << '%';
                format += 2;
                continue;
            }
            std::cout << value;
            printX(format + 1, args...);
            return;
        }
        std::cout << *format++;
    }
    throw std::invalid_argument("extra argument");
}

int main() {
    printX("name=%, count=%, progress=100%%\n", "Ace", 15);
}
```

输出为 `name=Ace, count=15, progress=100%`。遇到第一个占位符时，函数打印 `"Ace"`，再把剩余格式串和参数 `15` 交给下一次调用。格式串和参数的数量对不上时抛出异常；此前已经打印的内容不会撤回。

旧版示例参考了 [Stack Overflow 上的可变参数模板讨论](https://stackoverflow.com/questions/3634379/variadic-templates)。这里将递归调用统一为 `printX`，避免意外转去调用 C 的 `printf`。

## 例子三：递归求最大值

把问题缩成“第一个数与剩余数字的最大值比较”。只剩一个数时，它自己就是结果。这个示例限定整数输入，不是任意类型都适用的通用比较器。

```cpp
#include <iostream>
#include <algorithm>

int maximum(int n)
{
    return n;
}

template<typename... Args>
int maximum(int n,Args... args)
{
    return std::max(n,maximum(args...));
}

int main(){
    int res = maximum(57,48,60,100,20,18);
    std::cout << res << std::endl;

    //std::max()已可接受任意个数参数值，使用时需要使用{}形式(initializer_list)
    int ans = std::max({57,48,60,100,20,18});
    std::cout << ans << std::endl;
    return 0;
}

```

运行结果：

```
100
100
```

## 例子四：按编译期下标遍历 tuple

`tuple` 的各个元素可以有不同类型，`std::get<IDX>` 的下标又必须在编译期确定。因此，下面用类模板的实例化逐项推进下标，走到元素个数时停止。

```cpp
#include <iostream>
#include <tuple>
#include <bitset>
#include <string>

using namespace std;

template<int IDX,int MAX,typename... Args>
struct PRINT_TUPLE{
    static void print(ostream& os,const tuple<Args...>&t){
        os << get<IDX>(t) <<(IDX+1 == MAX? "":",");
        PRINT_TUPLE<IDX+1,MAX,Args...>::print(os,t);
    }

};

// 偏特化：IDX 等于 MAX 时停止递归；MAX 和 Args 仍是模板参数
template<int MAX,typename... Args>
struct PRINT_TUPLE<MAX,MAX,Args...>{
    static void print(ostream& os,const tuple<Args...>&t){
    }
};

template<typename... Args>
ostream& operator<<(ostream& os,const tuple<Args...>& t){
    os<<"[";
    PRINT_TUPLE<0,sizeof...(Args),Args...>::print(os,t);
    return os <<"]";
}
int main() {
    /* 编译器实例化下面5个类：
       PRINT_TUPLE<0,4,…>   // 打印第 0 个元素，再递归
       PRINT_TUPLE<1,4,…>   // 打印第 1 个元素，再递归
       PRINT_TUPLE<2,4,…>
       PRINT_TUPLE<3,4,…>
       PRINT_TUPLE<4,4,…>   // 递归终点，啥也不干
     */

    std::cout <<make_tuple(7.5,string("hello"),bitset<16>(377),42)<<std::endl;
    return 0;
}
```

运行结果：

```
[7.5,hello,0000000101111001,42]
```

前面三个例子用函数重载提供递归终点，最后一个用类模板偏特化提供终点。读这类代码时，先找“每次减少了什么”和“在哪个条件下停止”，通常比从省略号开始逐字猜更容易。
