---
title: leveldb源码阅读解析基础篇
author: 52coder
pubDatetime: 2023-06-15T15:33:05.569Z
slug: leveldb_source
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - leveldb
description: LevelDB is a fast key-value storage library written at Google that provides an ordered mapping from string keys to string values.
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

本文所阅读的leveldb代码版本[ac69108](https://github.com/52coder/leveldb),采用问题提问与解答的形式记录，部分源码阅读笔记来源于23年，25年博客迁移基于最新版代码更新。



## 问题1：宏LEVELDB_EXPORT的作用？
代码来源：export.h
这行代码的作用是定义一个宏 `LEVELDB_EXPORT`，并将其设置为 `__attribute__((visibility("default")))`。这个宏主要用于在编译时控制符号的可见性，特别是在编译共享库（动态链接库）时。

1. **`__attribute__((visibility("default")))`**：
    - `__attribute__` 是 GCC 编译器提供的扩展语法，用于为声明或类型指定特殊属性。
    - `visibility("default")` 是一个属性，用于控制符号的可见性。具体来说，它控制着编译器生成的符号在共享库中的可见性。
2. **符号可见性**：
    - **默认可见性 (****`default`****)**：当一个符号（如函数、类、变量等）被声明为 `default` 可见性时，它在共享库中是可见的，可以被其他模块或程序链接和使用。
    - **隐藏可见性 (****`hidden`****)**：如果一个符号被声明为 `hidden` 可见性，它在共享库中是不可见的，不能被其他模块或程序链接和使用。

 使用场景

- **编译共享库**：当编译一个共享库时，通常希望库中的某些符号（如公共接口）对外可见，而其他内部符号对用户隐藏。通过使用 `__attribute__((visibility("default")))`，可以确保这些公共接口在共享库中是可见的。
- **优化**：隐藏不必要的符号可以减少共享库的大小，提高加载速度，并减少符号冲突的风险。



```C++
// example.h
#ifndef EXAMPLE_H
#define EXAMPLE_H

#define LEVELDB_EXPORT __attribute__((visibility("default")))
#define LEVELDB_HIDDEN __attribute__((visibility("hidden")))

LEVELDB_EXPORT void publicFunction();
LEVELDB_HIDDEN void privateFunction();

#endif // EXAMPLE_H

// example.cpp
#include "example.h"
#include <iostream>

void publicFunction() {
    std::cout << "This is a public function." << std::std::endl;
}

void privateFunction() {
    std::cout << "This is a private function." << std::std::endl;
}


```

编译方法：

g++ -fPIC -shared -o [libexample.so](http://libexample.so) [example.cc](http://example.cc)



```6502 Assembly
 nm -gC libexample.so 
0000000000201050 B __bss_start
                 U __cxa_atexit@@GLIBC_2.2.5
                 w __cxa_finalize@@GLIBC_2.2.5
0000000000201050 D _edata
0000000000201058 B _end
0000000000000a14 T _fini
                 w __gmon_start__
00000000000007c0 T _init
                 w _ITM_deregisterTMCloneTable
                 w _ITM_registerTMCloneTable
                 w _Jv_RegisterClasses
0000000000000950 T publicFunction()
                 U std::ostream::operator<<(std::ostream& (*)(std::ostream&))@@GLIBCXX_3.4
                 U std::ios_base::Init::Init()@@GLIBCXX_3.4
                 U std::ios_base::Init::~Init()@@GLIBCXX_3.4
                 U std::cout@@GLIBCXX_3.4
                 U std::basic_ostream<char, std::char_traits<char> >& std::endl<char, std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&)@@GLIBCXX_3.4
                 U std::basic_ostream<char, std::char_traits<char> >& std::operator<< <std::char_traits<char> >(std::basic_ostream<char, std::char_traits<char> >&, char const*)@@GLIBCXX_3.4
```


## 问题2：构造函数中C++11特性 default作用?
源代码：include/leveldb/slice.h
在这段代码中，`Slice`类的拷贝构造函数和赋值操作符（`operator=`）都被声明为`default`。这是 C++11 引入的一个特性，用于显式地要求编译器生成默认的拷贝构造函数和赋值操作符。具体来说：

1. **拷贝构造函数 (****`Slice(const Slice&) = default;`****)**:
    - 当你使用 `default` 关键字时，编译器会生成一个默认的拷贝构造函数。这个默认的拷贝构造函数会逐成员地进行浅拷贝（即每个成员变量都会被简单地复制）。
    - 对于 `Slice` 类，这意味着 `data_` 和 `size_` 会被简单地复制到新对象中。
2. **赋值操作符 (****`Slice& operator=(const Slice&) = default;`****)**:
    - 同样，使用 `default` 关键字时，编译器会生成一个默认的赋值操作符。这个默认的赋值操作符也会逐成员地进行浅拷贝。
    - 对于 `Slice` 类，这意味着 `data_` 和 `size_` 会被简单地从源对象复制到目标对象中。

为什么使用 `default` 关键字？

1. **明确性**:
    - 使用 `default` 关键字可以明确地告诉读者和编译器，你希望使用默认的拷贝构造函数和赋值操作符。这有助于提高代码的可读性和可维护性。
2. **避免隐式生成**:
    - 如果你不显式地声明这些函数，编译器会在需要时隐式地生成它们。使用 `default` 关键字可以避免这种隐式生成，使代码更加清晰。
3. **防止意外的禁用**:
    - 如果你在类中声明了其他特殊成员函数（如移动构造函数或移动赋值操作符），编译器会默认禁用默认的拷贝构造函数和赋值操作符。使用 `default` 关键字可以确保这些函数仍然可用。

示例代码

假设你有以下代码：

```C++
Slicea("hello",5);
// 调用拷贝构造函数
Slice b = a;
Slice c;
// 调用赋值操作符
c = a;
```



在上述代码中：

- `b` 通过拷贝构造函数从 `a` 复制而来。
- `c` 通过赋值操作符从 `a` 复制而来。

由于`Slice`类的拷贝构造函数和赋值操作符都被声明为`default`，编译器会生成默认的实现，这些实现会简单地复制`data_`和`size_` 成员变量。




## 问题3：FALLTHROUGH_INTENDED用法
源代码：util/hash.cc 
```C++

// The FALLTHROUGH_INTENDED macro can be used to annotate implicit fall-through
// between switch labels. The real definition should be provided externally.
// This one is a fallback version for unsupported compilers.
#ifndef FALLTHROUGH_INTENDED
#define FALLTHROUGH_INTENDED \
  do {                       \
  } while (0)
#endif

```

```C++
#include <iostream>
#include <string>

// 定义 FALLTHROUGH_INTENDED 宏
#ifndef FALLTHROUGH_INTENDED
#define FALLTHROUGH_INTENDED \
  do {                       \
  } while (0)
#endif

void processNumber(int num) {
  switch (num) {
    case 1:
      std::cout << "Number is 1" << std::endl;
      FALLTHROUGH_INTENDED;
    case 2:
      std::cout << "Number is 2" << std::endl;
      FALLTHROUGH_INTENDED;
    case 3:
      std::cout << "Number is 3" << std::endl;
      break;
    default:
      std::cout << "Number is not 1, 2, or 3" << std::endl;
      break;
  }
}

int main() {
  processNumber(1);
  processNumber(3);
  processNumber(4);
  return 0;
}

```



运行结果：

```text
Number is 1
Number is 2
Number is 3
Number is 3
Number is not 1, 2, or 3
```



如果支持c++17:

```C++
#include <iostream>
#include <string>

void processNumber(int num) {
  switch (num) {
    case 1:
      std::cout << "Number is 1" << std::endl;
      [[fallthrough]];
    case 2:
      std::cout << "Number is 2" << std::endl;
      [[fallthrough]];
    case 3:
      std::cout << "Number is 3" << std::endl;
      break;
    default:
      std::cout << "Number is not 1, 2, or 3" << std::endl;
      break;
  }
}

int main() {
  processNumber(1);
  processNumber(3);
  processNumber(4);
  return 0;
}

```

运行结果：

```text
Number is 1
Number is 2
Number is 3
Number is 3
Number is not 1, 2, or 3
```



## 问题4：hash.cc中m为什么是0xc6a4a793 ？
源代码：util/hash.cc
1. MurmurHash 是一种高效的哈希函数，广泛用于各种场景。`0xc6a4a793` 是 MurmurHash 中的一个常用常量，可以有效地混合输入数据，减少哈希碰撞的概率。具体来说，这个常量在乘法和位运算中能够很好地扩散输入数据的差异。

每次按照四字节长度读取字节流中的数据 `w`，并使用普通的哈希函数计算哈希值。计算过程中使用 `uint32_t` 的自然溢出特性。四字节读取则为了加速，最终可能剩下 3/2/1 个多余的字节，使用 `switch` 语句补充计算，以实现最好的性能。

这里 `FALLTHROUGH_INTENDED` 宏并无实际作用，仅仅作为一种“我确定我这里想跳过”的标志。`do {} while(0)` 对代码无影响，这种写法也会出现在一些多行的宏定义里。



## 问题5：为什么C/C++宏中要用do {……}while(0)

[https://stackoverflow.com/questions/257418/do-while-0-what-is-it-good-for](https://stackoverflow.com/questions/257418/do-while-0-what-is-it-good-for)

```C++
#define FOO(x) foo(x); bar(x)

if (condition)
    FOO(x);
else // syntax error here
    ...;
```

假设宏FOO(x) 定义是foo(x); bar(x)，这里如果是放在if语句中(if语句未加{})会存在问题，编译失败。



如果宏修改为：

```C
#define FOO(x) { foo(x); bar(x); }

```

会同样报错，因为如果开发者在FOO(x)后添加了;号会报错。



正确的解决方法：

```C
#define FOO(x) do { foo(x); bar(x); } while (0)

if (condition)
    FOO(x);
else
    ....

替换后的代码正确：
if (condition)
   do { foo(x); bar(x); } while (0);
else
    ....

```


## 问题6：这里GUARDED_BY的作用？
源代码：util/cache.cc

```C++
  void LRU_Remove(LRUHandle* e);
  void LRU_Append(LRUHandle* list, LRUHandle* e);
  void Ref(LRUHandle* e);
  void Unref(LRUHandle* e);
  bool FinishErase(LRUHandle* e) EXCLUSIVE_LOCKS_REQUIRED(mutex_);

  // Initialized before use.
  size_t capacity_;

  // mutex_ protects the following state.
  mutable port::Mutex mutex_;
  size_t usage_ GUARDED_BY(mutex_);

  // Dummy head of LRU list.
  // lru.prev is newest entry, lru.next is oldest entry.
  // Entries have refs==1 and in_cache==true.
  LRUHandle lru_ GUARDED_BY(mutex_);

  // Dummy head of in-use list.
  // Entries are in use by clients, and have refs >= 2 and in_cache==true.
  LRUHandle in_use_ GUARDED_BY(mutex_);

  HandleTable table_ GUARDED_BY(mutex_);
```

GUARDED_BY(mu)	 变量必须被 `mu` 保护（通常用于成员变量）

类似的还有：

`PT_GUARDED_BY(mu)`  指针指向的数据必须被 mu 保护

`EXCLUSIVE_LOCKS_REQUIRED(mu)` 函数调用时必须持有 mu（排他锁）



这里的 `GUARDED_BY` 是 Clang 编译器提供的**线程安全静态分析注解**（Thread Safety Analysis），用于在编译时检查多线程代码中的锁使用是否正确。它的作用是标记一个变量必须被指定的互斥锁保护，如果代码中访问该变量时未持有正确的锁，编译器会发出警告。

示例：

```C++
#include "thread_annotations.h"

class ThreadSafeCounter {
 private:
  mutable Mutex mu_;
  int count_ GUARDED_BY(mu_);  // 标记count_必须被mu_保护

 public:
  void Increment() {
    mu_.Lock();
    count_++;  // 正确：持有mu_时访问count_
    mu_.Unlock();
  }

  int GetCount() const {
    // mu_.AssertHeld(); // 可选：运行时检查是否持有锁
    return count_;  // 错误：未加锁访问GUARDED_BY变量（Clang会报警告）
  }
};

```


## 问题7：为什么要取高4位值作为分片位置？
源代码：util/cache.cc

原因：哈希函数的高位通常分布更均匀，低位容易因为key的某些规律性而分布不均(比如自增)

取高位可以让key更均匀地分布到16个分片(shard)中，避免热点分布，提升并发性能



## 问题8：计算per_shard时为什么要加上kNumShards - 1
源代码：util/cache.cc
这是向上取整的常用技巧

- 举例：假设 capacity=100，kNumShards=16。
    - 直接除法：100/16 = 6（舍去小数），总共只分配了 6*16=96，少了4。
    - 加上 15 后再除： (100+15)/16 = 115/16 = 7（向上取整），总共分配 7*16=112，保证每个分片至少有足够空间，且总容量不小于用户期望。
- 这样做可以保证**每个分片都能分到足够的容量**，不会因为整除导致总容量变小。



## 问题9：LRUCache::Insert函数详解
源代码：util/cache.cc
这里主要讲解下FinishErase函数，这里有一些难理解。

```C++
Cache::Handle* LRUCache::Insert(const Slice& key, uint32_t hash, void* value,
                                size_t charge,
                                void (*deleter)(const Slice& key,
                                                void* value)) {
  MutexLock l(&mutex_);

  LRUHandle* e =
      reinterpret_cast<LRUHandle*>(malloc(sizeof(LRUHandle) - 1 + key.size()));
  e->value = value;
  e->deleter = deleter;
  e->charge = charge;
  e->key_length = key.size();
  e->hash = hash;
  e->in_cache = false;
  e->refs = 1;  // for the returned handle.
  std::memcpy(e->key_data, key.data(), key.size());

  if (capacity_ > 0) {
    e->refs++;  // for the cache's reference.
    e->in_cache = true;
    LRU_Append(&in_use_, e);
    usage_ += charge;
    FinishErase(table_.Insert(e));
  } else {  // don't cache. (capacity_==0 is supported and turns off caching.)
    // next is read by key() in an assert, so it must be initialized
    e->next = nullptr;
  }
  while (usage_ > capacity_ && lru_.next != &lru_) {
    LRUHandle* old = lru_.next;
    assert(old->refs == 1);
    bool erased = FinishErase(table_.Remove(old->key(), old->hash));
    if (!erased) {  // to avoid unused variable when compiled NDEBUG
      assert(erased);
    }
  }

  return reinterpret_cast<Cache::Handle*>(e);
}
```

table.Insert(e)会把新元素插入哈希表，如果有相同key的旧元素，会返回旧元素，调用FinishErase执行清理（减少引用计数，释放内存，更新usage_等）。


如果插入元素之后使用量usage_ > capacity_则需要不断淘汰最久未使用的元素（即 lru_.next指向的元素),调用table_.Remove()从hash表中移除该元素，并返回指针，同样需要调用FinishErase()函数执行清理。


## 问题10：KeyMayMatch函数如果这个May有什么特殊用法？
问题源码：include/leveldb/filter_policy.h

`KeyMayMatch`负责判断`key`是否在`filter`中。函数名中需要特别注意这个`May`，即这里`Match`判断可能会出错，也允许会出错。对于布隆过滤器，如果`Key`在`filter`里，那么一定会`Match`上；反之如果不在，可能返回true或false,结合注释可以验证。

```C++
  // "filter" contains the data appended by a preceding call to
  // CreateFilter() on this class.  This method must return true if
  // the key was in the list of keys passed to CreateFilter().
  // This method may return true or false if the key was not on the
  // list, but it should aim to return false with a high probability.
  virtual bool KeyMayMatch(const Slice& key, const Slice& filter) const = 0;
```



## 问题11：策略模式

filter_policy.h中的设计是一个典型的策略模式，filter_policy.h中对外提供NewBloomFilterPolicy接口，一个简单的可运行demo:

维基百科

```C++
#include <iostream>

using namespace std;

class StrategyInterface
{
public:
    virtual void execute() = 0;
};

class ConcreteStrategyA: public StrategyInterface
{
public:
    virtual void execute()
    {
        cout << "Called ConcreteStrategyA execute method" << endl;
    }
};

class ConcreteStrategyB: public StrategyInterface
{
public:
    virtual void execute()
    {
        cout << "Called ConcreteStrategyB execute method" << endl;
    }
};

class ConcreteStrategyC: public StrategyInterface
{
public:
    virtual void execute()
    {
        cout << "Called ConcreteStrategyC execute method" << endl;
    }
};

class Context
{
private:
    StrategyInterface *_strategy;

public:
    Context(StrategyInterface *strategy):_strategy(strategy)
    {
    }

    void set_strategy(StrategyInterface *strategy)
    {
        _strategy = strategy;
    }

    void execute()
    {
        _strategy->execute();
    }
};

int main(int argc, char *argv[])
{
    ConcreteStrategyA concreteStrategyA;
    ConcreteStrategyB concreteStrategyB;
    ConcreteStrategyC concreteStrategyC;

    Context contextA(&concreteStrategyA);
    Context contextB(&concreteStrategyB);
    Context contextC(&concreteStrategyC);

    contextA.execute();
    contextB.execute();
    contextC.execute();

    contextA.set_strategy(&concreteStrategyB);
    contextA.execute();
    contextA.set_strategy(&concreteStrategyC);
    contextA.execute();

    return 0;
}

运行结果：
Called ConcreteStrategyA execute method
Called ConcreteStrategyB execute method
Called ConcreteStrategyC execute method
Called ConcreteStrategyB execute method
Called ConcreteStrategyC execute method


```

```C++
#include <iostream>
#include <string>
#include <vector>

// 策略基类
class FilterPolicy {
public:
    virtual ~FilterPolicy() {}
    virtual std::string Name() const = 0;
    virtual void CreateFilter(const std::vector<std::string>& keys, std::string& dst) const = 0;
    virtual bool KeyMayMatch(const std::string& key, const std::string& filter) const = 0;
};

// 具体策略：简单字符串拼接过滤器
class SimpleFilterPolicy : public FilterPolicy {
public:
    std::string Name() const override { return "SimpleFilter"; }
    void CreateFilter(const std::vector<std::string>& keys, std::string& dst) const override {
        for (const auto& k : keys) dst += k + ";";
    }
    bool KeyMayMatch(const std::string& key, const std::string& filter) const override {
        return filter.find(key + ";") != std::string::npos;
    }
};

// 具体策略：模拟布隆过滤器（这里只是演示，不是真正的布隆过滤器）
class BloomFilterPolicy : public FilterPolicy {
    int bits_per_key_;
public:
    explicit BloomFilterPolicy(int bits_per_key) : bits_per_key_(bits_per_key) {}
    std::string Name() const override { return "BloomFilter"; }
    void CreateFilter(const std::vector<std::string>& keys, std::string& dst) const override {
        dst += "bloom:";
        for (const auto& k : keys) dst += k + "|";
    }
    bool KeyMayMatch(const std::string& key, const std::string& filter) const override {
        // 这里只是简单模拟
        return filter.find(key + "|") != std::string::npos;
    }
};

// 工厂函数
const FilterPolicy* NewBloomFilterPolicy(int bits_per_key) {
    return new BloomFilterPolicy(bits_per_key);
}

// 上下文
class DB {
    const FilterPolicy* policy_;
public:
    DB(const FilterPolicy* policy) : policy_(policy) {}
    ~DB() { delete policy_; }
    void Test() {
        std::vector<std::string> keys = {"a", "b", "c"};
        std::string filter;
        policy_->CreateFilter(keys, filter);
        std::cout << "Policy: " << policy_->Name() << std::endl;
        std::cout << "Filter: " << filter << std::endl;
        std::cout << "Key 'b' may match? " << policy_->KeyMayMatch("b", filter) << std::endl;
        std::cout << "Key 'x' may match? " << policy_->KeyMayMatch("x", filter) << std::endl;
    }
};

int main() {
    // 用工厂函数创建策略
    const FilterPolicy* policy = NewBloomFilterPolicy(10);
    DB db(policy);
    db.Test();
    return 0;
}
```

运行结果：

```Markdown
Policy: BloomFilter
Filter: bloom:a|b|c|
Key 'b' may match? 1
Key 'x' may match? 0
```