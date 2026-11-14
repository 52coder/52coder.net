---
title: vector动态扩容存在的陷阱
author: 52coder
pubDatetime: 2016-07-22T15:33:05.569Z
modDatetime: 2026-11-08T00:00:00+08:00
slug: vector_growth
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: vector 扩容时为什么有移动构造却仍然拷贝？从一段日志看 noexcept、异常保证和 reserve 的作用。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 问题背景

向 `std::vector` 追加元素时，如果容量不够，它需要申请更大的连续存储区，再将旧元素搬过去。这里的“搬”可能调用移动构造，也可能调用拷贝构造。

下面的 `Test` 明明定义了移动构造，扩容日志却出现了 `Test copy`。原因藏在移动构造是否可能抛异常这个条件里。

```
#include <iostream>
#include <vector>

struct Test {
    Test() {std::cout << "Test" << std::endl;}
    ~Test() {std::cout << "~Test" << std::endl;}
    Test(const Test &) {std::cout << "Test copy" << std::endl;}
    Test(Test &&) {std::cout << "Test move" << std::endl;}
};

int main(int argc, const char *argv[]) {
    std::vector<Test> ve;
    //ve.reserve(3);
    ve.emplace_back();
    ve.emplace_back();
    ve.emplace_back();

    return 0;
}
```

注释掉ve.reserve(3);后输出：

```
Test
Test
Test copy
~Test
Test
Test copy
Test copy
~Test
~Test
~Test
~Test
~Test
```

| 编号  | 输出内容    | 原因说明                                                    |
| ----- | ----------- | ----------------------------------------------------------- |
| **①** | `Test`      | 第一次 `emplace_back()`，构造第 1 个对象                    |
| **②** | `Test`      | 第二次 `emplace_back()`，容量从 1 扩到 2，先构造第 2 个对象 |
| **③** | `Test copy` | 扩容时**拷贝构造**旧元素（第 1 个对象）到新缓冲区           |
| **④** | `~Test`     | 析构旧缓冲区中的第 1 个对象                                 |
| **⑤** | `Test`      | 第三次 `emplace_back()`，容量从 2 扩到 4，先构造第 3 个对象 |
| **⑥** | `Test copy` | 拷贝旧缓冲区中的第 1 个对象                                 |
| **⑦** | `Test copy` | 拷贝旧缓冲区中的第 2 个对象                                 |
| **⑧** | `~Test`     | 析构旧缓冲区中的第 1 个对象                                 |
| **⑨** | `~Test`     | 析构旧缓冲区中的第 2 个对象                                 |
| **⑩** | `~Test`     | 析构最终缓冲区中的第 1 个对象（程序结束时）                 |
| **⑪** | `~Test`     | 析构最终缓冲区中的第 2 个对象                               |
| **⑫** | `~Test`     | 析构最终缓冲区中的第 3 个对象                               |

未注释掉的情况下程序输出：

```
Test
Test
Test
~Test
~Test
~Test
```

如果我们设置了reserve(3)，这里emplace_back调用3次，执行3次构造函数，程序结束时调用3次析构函数。

`reserve(3)` 只预留容量，不会创建三个元素，`size()` 仍为 0。随后三次插入都不超过容量，因此无须搬动旧元素。

不预留容量时，本次运行观察到容量按 `0 → 1 → 2 → 4` 增长，所以后两次插入触发了重新分配。这是所用标准库的行为，C++ 标准没有要求所有实现都按两倍增长，日志中的构造、析构顺序也不能当成通用保证。

这里需要区分两组概念：拷贝构造不等于深拷贝，移动构造也不等于浅拷贝。它们具体如何处理资源，由类型的实现决定。这个 `Test` 只打印日志，根本没有需要深拷贝的资源。

## 为什么没有选择移动构造

带着这样的疑问我去研读了STL的源码（GNU版本），在vector扩容时，会调用\_M_realloc_insert函数，该函数在vector.tcc文件中实现。在这个函数里面对已有元素进行拷贝的时候，看到了类似这样的代码：

```
__new_finish
		= std::__uninitialized_move_if_noexcept_a
		(__old_start, __position.base(),
		 __new_start, _M_get_Tp_allocator());

	      ++__new_finish;
```

有趣的就是这个\_\_uninitialized_move_if_noexcept_a，我们找到这个函数的实现：

```
template<typename _InputIterator, typename _ForwardIterator,
	   typename _Allocator>
    inline _ForwardIterator
    __uninitialized_move_if_noexcept_a(_InputIterator __first,
				       _InputIterator __last,
				       _ForwardIterator __result,
				       _Allocator& __alloc)
    {
      return std::__uninitialized_copy_a
	(_GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(__first),
	 _GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(__last), __result, __alloc);
    }
```

再看一下\_GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR的实现

```
#if __cplusplus >= 201103L
#define _GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(_Iter) std::__make_move_if_noexcept_iterator(_Iter)
#else
#define _GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(_Iter) (_Iter)
#endif // C++11
```

也就是说，在C++11以前，这玩意就是对象本身（毕竟C++11以前还没有移动构造），而在C++11以后被定义成了\_\_make_move_if_noexcept_iterator，继续查看其定义。

```
template<typename _Iterator, typename _ReturnType
    = typename conditional<__move_if_noexcept_cond
      <typename iterator_traits<_Iterator>::value_type>::value,
                _Iterator, move_iterator<_Iterator>>::type>
    inline _GLIBCXX17_CONSTEXPR _ReturnType
    __make_move_if_noexcept_iterator(_Iterator __i)
    { return _ReturnType(__i); }
```

`conditional` 根据 `__move_if_noexcept_cond` 选择迭代器类型。条件为真时保留普通迭代器，否则使用移动迭代器。下面继续看这个条件由什么组成。
继续深挖这个\_\_move_if_noexcept_cond，看到这样的代码：

```
template<typename _Tp>
    struct __move_if_noexcept_cond
    : public __and_<__not_<is_nothrow_move_constructible<_Tp>>,
                    is_copy_constructible<_Tp>>::type { };
```

也就是说，如果一个类，不存在不会抛出异常的移动构造函数并且可拷贝，那么就为真。
本例的移动构造没有 `noexcept`，同时又支持拷贝，因此符合这个条件，最终选择了拷贝构造。

## 让确实不会抛异常的移动构造声明 noexcept

对于确实不会抛异常的移动构造，可以声明 `noexcept`，让容器知道移动不会中途失败。若函数实际可能抛异常，就不能为了触发移动而随便添加这个声明。
顺道我们也看一眼移动迭代器的原理:

```
template<typename _Iterator>
class move_iterator {
    _Iterator _M_current;
    // ...
  public:
    using iterator_type = _Iterator;
	explicit _GLIBCXX17_CONSTEXPR
      	move_iterator(iterator_type __i)
      	: _M_current(std::move(__i)) { }
    // ...
}
```

这里构造函数中的 `std::move(__i)` 移动的是迭代器对象本身。元素之所以能够触发移动构造，关键还在移动迭代器的解引用结果：它把对元素的访问转换为可供移动使用的引用，而不是在构造迭代器时就搬动元素。
所以，修改Test代码，实现noexcept移动构造：

```cpp
#include <iostream>
#include <vector>

struct Test {
    Test() {std::cout << "Test" << std::endl;}
    ~Test() {std::cout << "~Test" << std::endl;}
    Test(const Test &) {std::cout << "Test copy" << std::endl;}
    Test(Test &&) noexcept {std::cout << "Test move" << std::endl;}
};

int main(int argc, const char *argv[]) {
    std::vector<Test> ve;
    ve.emplace_back();
    ve.emplace_back();
    ve.emplace_back();
    return 0;
}
```

打印结果如下：

```
Test
Test
Test move
~Test
Test
Test move
Test move
~Test
~Test
~Test
~Test
~Test
```

输出相关解释
| 编号 | 输出内容 | 发生位置 / 触发原因 |
| ----- | ----------- | -------------------------------------------------------------------------------------------------- |
| **①** | `Test` | `ve.emplace_back()` 第一次被调用，`vector` 为空，容量 0→1，直接在新的内存里 **构造第 1 个对象**。 |
| **②** | `Test` | `ve.emplace_back()` 第二次被调用，当前容量 1，已有 1 个元素，需要 **扩容到 2**。<br>• 在新缓冲区里 **构造第 2 个对象**（先构造新元素，再移动旧元素）。 |
| **③** | `Test move` | 扩容时需要把 **旧缓冲区中的第 1 个对象** 移动构造到新的缓冲区。 |
| **④** | `~Test` | 旧缓冲区被释放，**析构旧缓冲区中的第 1 个对象**（移动后源对象马上销毁）。 |
| **⑤** | `Test` | `ve.emplace_back()` 第三次被调用，当前容量 2，已有 2 个元素，需要 **扩容到 4**。<br>• 在新缓冲区里 **构造第 3 个对象**。 |
| **⑥** | `Test move` | 把 **旧缓冲区中的第 1 个对象** 移动构造到新缓冲区。 |
| **⑦** | `Test move` | 把 **旧缓冲区中的第 2 个对象** 移动构造到新缓冲区。 |
| **⑧** | `~Test` | 析构旧缓冲区中的 **第 1 个对象**（移动后源对象）。 |
| **⑨** | `~Test` | 析构旧缓冲区中的 **第 2 个对象**（移动后源对象）。 |
| **⑩** | `~Test` | `main` 结束，`vector` 析构，**析构第 1 个元素**。 |
| **⑪** | `~Test` | **析构第 2 个元素**。 |
| **⑫** | `~Test` | **析构第 3 个元素**。 |

这次如我们所愿，调用了移动构造。

## 选择拷贝，是为了保留出错后恢复的余地

假设搬到第 10 个元素时抛出异常。若之前用的是拷贝，原来的元素通常还在，容器可以销毁新副本并放弃这次扩容。若之前用的是移动，源对象可能已经交出了资源，恢复原状就困难得多。

因此，对于本文这种在末尾插入、需要重新分配的情形，可以这样理解选择过程：

| 元素类型的条件             | 搬动旧元素时的常见选择                         |
| -------------------------- | ---------------------------------------------- |
| 移动构造保证不抛异常       | 移动                                           |
| 移动可能抛异常，但支持拷贝 | 为保留异常保证而选择拷贝                       |
| 不支持拷贝，只能移动       | 只能移动；移动抛异常时，不能期待相同的恢复保证 |

`noexcept` 是承诺，违反承诺会导致 `std::terminate`，不是把异常“忽略掉”。上面的日志演示没有管理资源，实际类还要检查每个成员的移动操作是否会抛异常。

另外，重新分配会使指向原有元素的指针、引用和迭代器失效。提前 `reserve` 可以减少重新分配，但超过预留容量后，这些失效规则仍然适用。

本文展示的是一份 GNU 标准库实现中的调用路径，内部函数名随版本可能变化。容器对外的约定以 [vector 修改操作与异常保证](https://eel.is/c++draft/vector.modifiers)为准。
