---
title: abseil C++ Tips
author: 52coder
pubDatetime: 2016-07-25T15:33:05.569Z
slug: abseil_cpp_tips
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: A series of C++ tips, about once a week, that became known as the “C++ Tips of the Week” (TotW). They became wildly successful, and we are still publishing
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents


学习[abseil C++ Tips](https://abseil.io/tips/)，持续记录学习总结，欢迎批评指正。

## Tip of the Week #1: string_view
当函数参数为(const) string时，常见的一般有3种方法，第三种方法可能不太常见。
```
// C Convention
void TakesCharStar(const char* s);

// Old Standard C++ convention
void TakesString(const std::string& s);

// string_view C++ conventions
void TakesStringView(absl::string_view s);    // Abseil
void TakesStringView(std::string_view s);     // C++17
```
前面两种方法只有当参数类型匹配时才比较方便，如果对void TakesCharStar(const char* s);函数传入std::string，需要调用c_str()函数。

```a
void AlreadyHasString(const std::string& s) {
  TakesCharStar(s.c_str());               // explicit conversion
}
```

如果是对函数void TakesString(const std::string& s);传入const char*，可以直接调用，但是实际上会触发std::string的拷贝构造函数，程序效率存在问题。

```
void AlreadyHasCharStar(const char* s) {
  TakesString(s); // compiler will make a copy
}
```

What to Do ?
可以使用c++17中的sting_view或absl::string_view，string_view可以支持两种类型直接调用，虽然存在隐式类型转换，但不会拷贝整个数据，所以不存在O(n)的内存消耗。string_view只是记录了自身对应字符串的地址信息。当const char*作为参数时，隐含传入了strlen()作为string_view的构造参数。

```
void TakesStringView(std::string_view s);   // C++17

void AlreadyHasString(const std::string& s) {
  TakesStringView(s); // no explicit conversion; convenient!
}

void AlreadyHasCharStar(const char* s) {
  TakesStringView(s); // no copy; efficient!
}
```

string_view详细教程参考：[learn c++ string_view](https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring_view/)
一个典型的例子：
```
#include <iostream>
#include <string>
#include <string_view>

void printSV(std::string_view str)
{
    std::cout << str << '\n';
}

int main()
{
    printSV("Hello, world!"); // call with C-style string literal

    std::string s2{ "Hello, world!" };
    printSV(s2); // call with std::string

    std::string_view s3 { s2 };
    printSV(s3); // call with std::string_view

    return 0;
}
```
std::string_view(C++17 引入)是一个只读的轻量级字符串视图，字符串视图并不真正的创建或者拷贝字符串，而只是拥有一个字符串的查看功能。
上面的代码演示string_view支持通过C-style string string_view初始化。

```
#include <iostream>
#include <string>
#include <string_view>

int main()
{
    std::string name { "Alex" };
    std::string_view sv { name }; // sv is now viewing name
    std::cout << sv << '\n'; // prints Alex

    sv = "John"; // sv is now viewing "John" (does not change name)
    std::cout << sv << '\n'; // prints John

    std::cout << name << '\n'; // prints Alex

    return 0;
}
```
运行结果：

```
Alex
John
Alex
```

对string_view对象赋值，改变的是sting_view指向的字符串，并不会改变字符串本身的值。

```
#include <iostream>
#include <string>
#include <string_view>

void printString(std::string str)
{
	std::cout << str << '\n';
}

int main()
{
	std::string_view sv{ "Hello, world!" };

	// printString(sv);   // compile error: won't implicitly convert std::string_view to a std::string

	std::string s{ sv }; // okay: we can create std::string using std::string_view initializer
	printString(s);      // and call the function with the std::string

	printString(static_cast<std::string>(sv)); // okay: we can explicitly cast a std::string_view to a std::string

	return 0;
}

```
运行结果：
```
Hello, world!
Hello, world!

```
C++中未提供std::string_view向std::string的隐式类型转换，这样可以阻止不小心将std::string_view隐式转换到std::string,避免拷贝带来的性能开销。

## 尽量以const,enum,inline替换#define
宁可以编译器替换预处理器。
例如#define  ASPECT_RATIO 1.653
符号ASPECT_RATIO从未被编译器看见，在预处理阶段已经完成替换，运行时错误时如果在代码中存在多个1.653将存在困惑。

解决办法是使用const double AspectRatio = 1.653,编译后进入符号表。
为了将常量的作用域限制于class内，你必须让它成为class的一个成员，为了确保此常量至多只有一份实例，你必须使用static.
```
#include <iostream>
using namespace std;

class GamePlayer {
private:
    static const int NumTurns = 5;//常量声明式
    int score[NumTurns];
};

int main(){
    return 0;
}

```
如果需要取某个class专属常量的地址，必须使用如下方式：
```
#include <iostream>
using namespace std;

class GamePlayer {
public:
    static const int NumTurns = 5;
    int score[NumTurns];
};

const int GamePlayer::NumTurns;
int main(){
    cout << GamePlayer::NumTurns << ",address NumTurns:"<<&GamePlayer::NumTurns;
    return 0;
}

```