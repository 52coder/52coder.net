---
title: leveldb源码阅读解析基础篇
author: 52coder
pubDatetime: 2023-06-15T15:33:05.569Z
modDatetime: 2026-11-08T00:00:00+08:00
slug: leveldb_source
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - leveldb
description: 以 LevelDB 的 Slice、哈希和缓存代码为线索，解释符号可见性、默认成员函数、锁注解与分片容量等 C++ 细节。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

这份笔记以 LevelDB 提交 `ac69108` 为阅读基准，保留了早期阅读时遇到的问题。文章从几个短函数和宏入手，解释它们在当前调用处解决什么问题；它不是完整的存储引擎原理介绍。核对其他版本时，优先按文件和函数名定位，行号可能变化。

## 问题1：宏LEVELDB_EXPORT的作用？

源代码：export.h

`LEVELDB_EXPORT` 标记需要向库外提供的接口。它不是在所有平台上都展开成同一段代码：Windows 动态库涉及 `dllexport`/`dllimport`，支持相关属性的编译器则可用 `__attribute__((visibility("default")))`；静态构建等分支可能展开为空。

以 GCC/Clang 的可见性属性为例，`default` 让符号可供库外链接，`hidden` 将它限制在当前共享对象内部。这与 C++ 的 `public`、`private` 访问控制不是一回事。下面的小例子用来观察动态符号表的变化。

```
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

```
g++ -fPIC -shared -o libexample.so example.cc
```

```
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

`Slice(const Slice&) = default` 和默认赋值运算符要求编译器按成员生成相应操作。对 `Slice` 来说，成员是数据指针和长度，所以复制一个 `Slice` 不会复制它指向的字符。

例如 `b = a` 之后，两个视图可以指向同一段字符。原字符的存储期仍由外部负责；释放底层缓冲区后，两个视图都会失效。

这不能推广为“所有 default 拷贝都是浅拷贝”。若成员是 `std::string`，生成的操作会调用字符串自己的拷贝操作；若成员不可拷贝，显式写 `= default` 也可能得到被删除的函数。

```
Slicea("hello",5);
// 调用拷贝构造函数
Slice b = a;
Slice c;
// 调用赋值操作符
c = a;
```

在上述代码中：
b 通过拷贝构造函数从 a 复制而来。
c 通过赋值操作符从 a 复制而来。
由于Slice类的拷贝构造函数和赋值操作符都被声明为default，编译器会生成默认的实现，这些实现会简单地复制data*和size* 成员变量。

## 问题3：FALLTHROUGH_INTENDED用法

源代码：util/hash.cc

```
// The FALLTHROUGH_INTENDED macro can be used to annotate implicit fall-through
// between switch labels. The real definition should be provided externally.
// This one is a fallback version for unsupported compilers.
#ifndef FALLTHROUGH_INTENDED
#define FALLTHROUGH_INTENDED \
  do {                       \
  } while (0)
#endif
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

```
Number is 1
Number is 2
Number is 3
Number is 3
Number is not 1, 2, or 3

```

如果支持c++17:

```
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

```
Number is 1
Number is 2
Number is 3
Number is 3
Number is not 1, 2, or 3
```

## 问题4：哈希常量 0xc6a4a793 的作用

源代码：util/hash.cc

MurmurHash 是一种高效的哈希函数，广泛用于各种场景。LevelDB 这里使用的是受 MurmurHash 启发的混合函数，`0xc6a4a793` 是实现选定的乘法常量。仅从这段代码无法推出“它就是碰撞率最小的常量”，判断哈希质量仍需分布测试；这里重点看乘法、异或与移位怎样把输入位的变化扩散到结果。
每次按照四字节长度读取字节流中的数据 w，并使用普通的哈希函数计算哈希值。计算过程中使用 uint32_t 的自然溢出特性。四字节读取则为了加速，最终可能剩下 3/2/1 个多余的字节，使用 switch 语句补充计算，以实现最好的性能。

`FALLTHROUGH_INTENDED` 不负责执行跳转，而是标明这里有意继续执行下一个 `case`。具体宏定义可能只起占位作用，也可能带编译器属性来抑制警告；C++17 可以用 `[[fallthrough]];` 表达相同意图。

## 问题5：为什么C/C++宏中要用do {……}while(0)

https://stackoverflow.com/questions/257418/do-while-0-what-is-it-good-for

```
#define FOO(x) foo(x); bar(x)

if (condition)
    FOO(x);
else // syntax error here
    ...;
```

假设宏FOO(x) 定义是foo(x); bar(x)，这里如果是放在if语句中(if语句未加{})会存在问题，编译失败。

如果宏修改为：

```
#define FOO(x) { foo(x); bar(x); }
```

会同样报错，因为如果开发者在FOO(x)后添加了;号会报错。

正确的解决方法：

```
#define FOO(x) do { foo(x); bar(x); } while (0)

if (condition)
    FOO(x);
else
    ....

```

替换后的代码正确：

```
if (condition)
   do { foo(x); bar(x); } while (0);
else
    ....

```

## 问题6：这里GUARDED_BY的作用？

源代码：util/cache.cc

```
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

GUARDED_BY(mu) 变量必须被 mu 保护（通常用于成员变量）

类似的还有：

PT_GUARDED_BY(mu) 指针指向的数据必须被 mu 保护

EXCLUSIVE_LOCKS_REQUIRED(mu) 函数调用时必须持有 mu（排他锁）

这里的 GUARDED_BY 是 Clang 编译器提供的线程安全静态分析注解（Thread Safety Analysis），用于在编译时检查多线程代码中的锁使用是否正确。它的作用是标记一个变量必须被指定的互斥锁保护，如果代码中访问该变量时未持有正确的锁，启用相应分析且编译器能够推导锁状态时，会发出警告。注解不会自动加锁，也不替代运行时同步。

示例：

```
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

这里用高 4 位选择 16 个分片，而分片内部的哈希表用低位定位桶。把两部分位分开使用，可以避免选定分片后，内部桶下标的部分位也被固定住。不能据此断言所有哈希函数的高位都比低位均匀；高低位的质量取决于具体函数。

## 问题8：计算per_shard时为什么要加上kNumShards - 1

源代码：util/cache.cc 这是向上取整的常用技巧

举例：假设 capacity=100，kNumShards=16。
直接除法：100/16 = 6（舍去小数），总共只分配了 6*16=96，少了4。
加上 15 后再除： (100+15)/16 = 115/16 = 7（向上取整），总共分配 7*16=112，保证每个分片至少有足够空间，且总容量不小于用户期望。
这保证分片预算之和不小于请求容量，不保证热点分片能借用其他分片的空闲空间。通用代码还应考虑加法溢出；对非负整数可写成 `capacity / n + (capacity % n != 0)`，其中 `n > 0`。

## 问题9：LRUCache::Insert函数详解

源代码：util/cache.cc

这里主要讲解下FinishErase函数，这里有一些难理解。

```
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

table.Insert(e)会把新元素插入哈希表，如果有相同key的旧元素，会返回旧元素，调用FinishErase执行清理（减少引用计数，释放内存，更新usage\_等）。

如果插入元素之后使用量usage* > capacity*则需要不断淘汰最久未使用的元素（即 lru*.next指向的元素),调用table*.Remove()从hash表中移除该元素，并返回指针，同样需要调用FinishErase()函数执行清理。

## 问题10：KeyMayMatch 中的 May 表示什么？

问题源码：include/leveldb/filter_policy.h

KeyMayMatch负责判断key是否在filter中。函数名中需要特别注意这个May，即这里Match判断可能会出错，也允许会出错。对于布隆过滤器，如果Key在filter里，那么一定会Match上；反之如果不在，可能返回true或false,结合注释可以验证。

```
  // "filter" contains the data appended by a preceding call to
  // CreateFilter() on this class.  This method must return true if
  // the key was in the list of keys passed to CreateFilter().
  // This method may return true or false if the key was not on the
  // list, but it should aim to return false with a high probability.
  virtual bool KeyMayMatch(const Slice& key, const Slice& filter) const = 0;

```

## 问题11：策略模式

filter_policy.h中的设计是一个典型的策略模式，filter_policy.h中对外提供NewBloomFilterPolicy接口，一个简单的可运行demo:

下面用一个独立示例说明：调用方只依赖统一接口，具体过滤策略可以替换。

```
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

```

运行结果：

```
Called ConcreteStrategyA execute method
Called ConcreteStrategyB execute method
Called ConcreteStrategyC execute method
Called ConcreteStrategyB execute method
Called ConcreteStrategyC execute method
```

```
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

```
Policy: BloomFilter
Filter: bloom:a|b|c|
Key 'b' may match? 1
Key 'x' may match? 0
```

源码与补充说明：[LevelDB 源码](https://github.com/google/leveldb/tree/ac69108)、[Clang 线程安全分析](https://clang.llvm.org/docs/ThreadSafetyAnalysis.html)。读缓存部分时，可以沿一次 `Insert`、`Lookup`、`Release` 追踪引用计数，比孤立地看宏定义更容易理解对象何时释放。
