---
title: C++模板使用例子
author: 52coder
pubDatetime: 2017-02-15T15:33:05.569Z
slug: cpp_template
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: 模板是 C++ 中的泛型编程的基础。 作为强类型语言，C++ 要求所有变量都具有特定类型，由程序员显式声明或编译器推导。 但是，许多数据结构和算法无论在哪种类型上操作，看起来都是相同的。 使用模板可以定义类或函数的操作，并让用户指定这些操作应处理的具体类型。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## variadic Templates
变化的是template parameters 

参数个数 (variable number) 
利用参数个数逐一递减的特性实现递归函数调用。使用function template完成。

参数类型(different type)  
利用参数个数逐一递减导致参数类型也逐一递减的特征，实现递归继承或递归复合以class template完成。 

##C++模板例子一

```
#include <iostream>
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
几点解释：
使用sizeof...(args)可以打印出参数个数，如果调用printX时传递了多个参数时，使用函数模版，将参数分为第一个和其他，然后递归调用printX()处理剩下的参数.

如果我们不定义没有参数的printX会有如下报错：
```
note: candidate function template not viable: requires at least argument 'firstArg', but no arguments were provided
void printX(const T& firstArg,const Types&... args)
```

## C++模板例子二

```
#include <iostream>
using namespace std;
void printX(const char *s)
{
    while (*s)
    {
        if (*s == '%' && *(++s) != '%')
            throw "invalid format string: missing arguments";
        std::cout << *s++;
    }
}

template<typename T, typename... Args>
void printX(const char* s, T value, Args... args)
{
    while (*s)
    {
        if (*s == '%' && *(++s) != '%')
        {
            std::cout << value;
            //如果不使用++,运行结果：15d This is Aces 0x6000030d8000p 3.14159f
            printf(++s, args...); // call even when *s == 0 to detect extra arguments
            return;
        }
        std::cout << *s++;
    }
    throw "extra arguments provided to printf";
}

int main(){
    int *pi = new int;
    printX("%d %s %p %f\n ",15,"This is Ace",pi,3.1415926);
    return 0;
}

```

例子来源：https://stackoverflow.com/questions/3634379/variadic-templates

## C++模板例子三

```
#include <iostream>

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

## C++模板例子四

```
#include <iostream>
#include <tuple>

using namespace std;

template<int IDX,int MAX,typename... Args>
struct PRINT_TUPLE{
    static void print(ostream& os,const tuple<Args...>&t){
        os << get<IDX>(t) <<(IDX+1 == MAX? "":",");
        PRINT_TUPLE<IDX+1,MAX,Args...>::print(os,t);
    }

};

//全特化（explicit specialization)表示递归终点，当索引等于元素个数时，使用特化版本，递归在编译期优雅地停止
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