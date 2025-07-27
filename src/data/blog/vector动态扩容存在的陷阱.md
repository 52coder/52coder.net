---
title: vector动态扩容存在的陷阱
author: 52coder
pubDatetime: 2016-07-22T15:33:05.569Z
slug: vector_growth
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - C++
description: 当我们向vector中添加元素时，如果现有的内存空间不足以容纳新元素，vector会进行扩容。扩容的过程涉及到在内存中重新分配更大的空间，将现有元素拷贝到新结构中。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 问题背景
我们知道，std::vector之所以可以动态扩容，同时还可以保持顺序存储，主要取决于其扩容复制的机制。当容量满时，会重新划分一片更大的内存区域，然后将所有的元素拷贝过去。
但是我却发现了一个奇怪的现象，std::vector扩容时，对其中的元素竟然进行的是深复制。请看示例代码：

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
| 编号    | 输出内容        | 原因说明                                       |
| ----- | ----------- | ------------------------------------------ |
| **①** | `Test`      | 第一次 `emplace_back()`，构造第 1 个对象             |
| **②** | `Test`      | 第二次 `emplace_back()`，容量从 1 扩到 2，先构造第 2 个对象 |
| **③** | `Test copy` | 扩容时**拷贝构造**旧元素（第 1 个对象）到新缓冲区               |
| **④** | `~Test`     | 析构旧缓冲区中的第 1 个对象                            |
| **⑤** | `Test`      | 第三次 `emplace_back()`，容量从 2 扩到 4，先构造第 3 个对象 |
| **⑥** | `Test copy` | 拷贝旧缓冲区中的第 1 个对象                            |
| **⑦** | `Test copy` | 拷贝旧缓冲区中的第 2 个对象                            |
| **⑧** | `~Test`     | 析构旧缓冲区中的第 1 个对象                            |
| **⑨** | `~Test`     | 析构旧缓冲区中的第 2 个对象                            |
| **⑩** | `~Test`     | 析构最终缓冲区中的第 1 个对象（程序结束时）                    |
| **⑪** | `~Test`     | 析构最终缓冲区中的第 2 个对象                           |
| **⑫** | `~Test`     | 析构最终缓冲区中的第 3 个对象                           |

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

如果没有设置reserve(3),默认只分配了一个元素的大小。第一次emplace_back时，仅进行了一次普通构造。第二次emplace_back时，就需要进行扩容，然后把第一个元素拷贝过去，再释放原来的对象。所以这里除了有一次新的构造以外，还有一次复制和释放。当第三次emplace_back时，进行了一次普通构造和拷贝前面插入的两个元素。
但关键问题就在于，Test类明明实现了移动构造（浅复制），可这里竟然调用了拷贝构造（深复制）。
如果vector扩容调用拷贝构造，当已有元素个数较多时，全部拷贝就会变得非常低效。
####查找原因
基于上述理由，我认为STL的开发者不可能连这个问题都考虑不到，但想不通为什么我明明实现了移动构造，却不能调用。
带着这样的疑问我去研读了STL的源码（GNU版本），在vector扩容时，会调用_M_realloc_insert函数，该函数在vector.tcc文件中实现。在这个函数里面对已有元素进行拷贝的时候，看到了类似这样的代码：
```
__new_finish
		= std::__uninitialized_move_if_noexcept_a
		(__old_start, __position.base(),
		 __new_start, _M_get_Tp_allocator());

	      ++__new_finish;
```
有趣的就是这个__uninitialized_move_if_noexcept_a，我们找到这个函数的实现：
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
再看一下_GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR的实现
```
#if __cplusplus >= 201103L
#define _GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(_Iter) std::__make_move_if_noexcept_iterator(_Iter)
#else
#define _GLIBCXX_MAKE_MOVE_IF_NOEXCEPT_ITERATOR(_Iter) (_Iter)
#endif // C++11
```
也就是说，在C++11以前，这玩意就是对象本身（毕竟C++11以前还没有移动构造），而在C++11以后被定义成了__make_move_if_noexcept_iterator，继续查看其定义。
```
template<typename _Iterator, typename _ReturnType
    = typename conditional<__move_if_noexcept_cond
      <typename iterator_traits<_Iterator>::value_type>::value,
                _Iterator, move_iterator<_Iterator>>::type>
    inline _GLIBCXX17_CONSTEXPR _ReturnType
    __make_move_if_noexcept_iterator(_Iterator __i)
    { return _ReturnType(__i); }
```
这里用了一个conditional，来判断这个迭代器的类型，如果__move_if_noexcept_cond为真，就取迭代器本身，否则就取移动迭代器。看起来问题就在这里了，之前我们的例程中的Test一定就是符合了这个__move_if_noexcept_cond，导致用了原始迭代器。
继续深挖这个__move_if_noexcept_cond，看到这样的代码：
```
template<typename _Tp>
    struct __move_if_noexcept_cond
    : public __and_<__not_<is_nothrow_move_constructible<_Tp>>,
                    is_copy_constructible<_Tp>>::type { };
```
也就是说，如果一个类，不存在不会抛出异常的移动构造函数并且可拷贝，那么就为真。
Test类显然符合，所以vector<Test>在复制时用了普通的迭代器进行了遍历，自然就会调用拷贝构造函数进行复制了。
####解决办法
所以，我们需要让Test不符合__move_if_noexcept_cond的条件，也就是这里要将移动构造函数声明为noexcept表示它不会抛出异常，这样vector<Test>在复制时就会使用移动迭代器（就是会包装一层std::move），从而触发移动构造。
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
确实调用了std::move，证明我们的思路没错。
所以，修改Test代码，实现noexcept移动构造：
```
struct Test {
    long a, b, c, d;
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
| 编号    | 输出内容        | 发生位置 / 触发原因                                                                                        |
| ----- | ----------- | -------------------------------------------------------------------------------------------------- |
| **①** | `Test`      | `ve.emplace_back()` 第一次被调用，`vector` 为空，容量 0→1，直接在新的内存里 **构造第 1 个对象**。                              |
| **②** | `Test`      | `ve.emplace_back()` 第二次被调用，当前容量 1，已有 1 个元素，需要 **扩容到 2**。<br>• 在新缓冲区里 **构造第 2 个对象**（先构造新元素，再移动旧元素）。 |
| **③** | `Test move` | 扩容时需要把 **旧缓冲区中的第 1 个对象** 移动构造到新的缓冲区。                                                               |
| **④** | `~Test`     | 旧缓冲区被释放，**析构旧缓冲区中的第 1 个对象**（移动后源对象马上销毁）。                                                           |
| **⑤** | `Test`      | `ve.emplace_back()` 第三次被调用，当前容量 2，已有 2 个元素，需要 **扩容到 4**。<br>• 在新缓冲区里 **构造第 3 个对象**。                |
| **⑥** | `Test move` | 把 **旧缓冲区中的第 1 个对象** 移动构造到新缓冲区。                                                                     |
| **⑦** | `Test move` | 把 **旧缓冲区中的第 2 个对象** 移动构造到新缓冲区。                                                                     |
| **⑧** | `~Test`     | 析构旧缓冲区中的 **第 1 个对象**（移动后源对象）。                                                                      |
| **⑨** | `~Test`     | 析构旧缓冲区中的 **第 2 个对象**（移动后源对象）。                                                                      |
| **⑩** | `~Test`     | `main` 结束，`vector` 析构，**析构第 1 个元素**。                                                               |
| **⑪** | `~Test`     | **析构第 2 个元素**。                                                                                     |
| **⑫** | `~Test`     | **析构第 3 个元素**。                                                                                     |

这次如我们所愿，调用了移动构造。

 ## 结论  

STL中考虑到异常的情况，因此，像这种容器内部的复制行为，是要求不能够发生异常的，因此，只有当移动构造函数声明为noexcept的时候才会调用，否则将统一调用拷贝构造函数。
然而，在移动构造函数中本来就不应该抛出异常，因此，在大多数情况下，移动构造函数都应该用noexcept来声明。