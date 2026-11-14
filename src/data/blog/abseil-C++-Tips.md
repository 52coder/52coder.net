---
title: abseil C++ Tips
author: 52coder
pubDatetime: 2016-07-25T15:33:05.569Z
modDatetime: 2026-11-08T00:00:00+08:00
slug: abseil_cpp_tips
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: 记录 Abseil C++ Tips 的阅读笔记：string_view 能省掉哪些复制，何时会悬空，以及 C++17 中怎样定义类内常量。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

这篇记录 [Abseil C++ Tips](https://abseil.io/tips/) 的阅读笔记。先看一个常见接口问题：函数只想读取字符串，调用者却可能传入不同类型，该怎样避免不必要的复制？

## Tip of the Week #1: string_view

一个只读字符串参数，可以写成下面几种形式。最后两个声明是分别使用 Abseil 和 C++17 标准库的替代写法。

```
// C Convention
void TakesCharStar(const char* s);

// Old Standard C++ convention
void TakesString(const std::string& s);

// string_view C++ conventions
void TakesStringView(absl::string_view s);    // Abseil
void TakesStringView(std::string_view s);     // C++17
```

前面两种方法只有当参数类型匹配时才比较方便，如果对void TakesCharStar(const char\* s);函数传入std::string，需要调用c_str()函数。

```cpp
void AlreadyHasString(const std::string& s) {
  TakesCharStar(s.c_str());               // explicit conversion
}
```

如果是对函数void TakesString(const std::string& s);传入const char\*，可以直接调用，但编译器会先用字符数组构造一个临时 `std::string`。这里复制的是字符内容，并不是调用 `std::string` 的拷贝构造函数；是否分配堆内存还取决于字符串长度与实现。

```
void AlreadyHasCharStar(const char* s) {
  TakesString(s); // compiler will make a copy
}
```

`std::string_view`（C++17）和 `absl::string_view` 可以同时接收这两类输入。视图记录一段字符的地址和长度，不拥有字符，因此不需要复制整段字符串。

不过，“没有复制”不等于“所有构造都是常数时间”。从以 `\0` 结尾的 `const char*` 构造视图时，仍需扫描字符来确定长度。接口说明见 [Abseil Tip #1](https://abseil.io/tips/1)。

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

```cpp
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
上面的三个调用分别传入字符串字面量、`std::string` 和已有的视图。函数内部统一按 `string_view` 读取。

```cpp
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

给 `string_view` 重新赋值，只是让视图改看另一段字符。所以上例最后打印 `name`，仍然得到 `Alex`。

```cpp
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

## 视图不负责延长字符串的寿命

`string_view` 省掉了复制，也把存储期交给了调用者。下面的函数会返回悬空视图：

```cpp
// 错误示例：函数返回后，name 已被销毁。
std::string_view badName() {
    std::string name = "Alex";
    return name;
}
```

需要返回自己生成的文本时，直接返回 `std::string`。如果只是同步读取调用者提供的字符，`string_view` 通常更合适；若要将视图保存到异步任务或成员变量里，就必须确认原字符一直存在，而且不会被重新分配。

还有一个容易遗漏的区别：视图可以只覆盖字符串的中间一段，`data()` 后面不保证紧跟 `\0`。把它交给只接收 C 字符串的 API 前，需要确认长度约定，必要时先构造 `std::string`。

## 用有类型的常量替代简单宏

`#define ASPECT_RATIO 1.653` 在预处理时替换文本；`constexpr double AspectRatio = 1.653;` 则有类型，也遵守 C++ 的作用域规则。编译器能据此做类型检查，但是否保留调试符号取决于构建配置，不能保证常量一定出现在符号表里。

C++17 中，类内常量可以这样写：

```cpp
#include <iostream>

class GamePlayer {
public:
    inline static constexpr int NumTurns = 5;
    int score[NumTurns]{};
};

int main() {
    std::cout << GamePlayer::NumTurns << '\n';
    std::cout << &GamePlayer::NumTurns << '\n';
}
```

`static` 表示它属于类，不随每个对象复制；`constexpr` 表示它可以用于常量表达式。C++17 的静态 `constexpr` 数据成员隐含 `inline`，上面显式写出只是为了强调：定义可以放在头文件里，取地址也不需要另写类外定义。

旧代码若使用 `static const int NumTurns = 5;`，在取地址等需要实体定义的场合，仍可能需要类外的 `const int GamePlayer::NumTurns;`。这两个写法对应的规则不同，不宜混用结论。条件编译等场合仍然需要预处理器，替换的是简单的常量宏，并非所有宏。

参考：[C++ 草案中的 static 数据成员规则](https://eel.is/c++draft/class.static.data)。
