---
title: MySQL基础知识
author: 52coder
pubDatetime: 2016-07-21T15:33:05.569Z
slug: mysql-easy
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - MySQL
description: MySQL基础知识
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents


##安装后修改密码
[安装mysql后修改密码](https://stackoverflow.com/questions/33510184/how-to-change-the-mysql-root-account-password-on-centos7?spm=a2c6h.12873639.0.0.2e533bb8E6K9By)
####MySQL连接
使用mysql -u root -p 连接，-u指定用户root,-p 密码选项,如果设置了密码需要加-p选项

连接方式一
```
[root ~]#mysql -u root -proot
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 10
Server version: 5.7.34 MySQL Community Server (GPL)

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
```

连接方式二
```
[root ~]#mysql -u root -p
Enter password:
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 11
Server version: 5.7.34 MySQL Community Server (GPL)

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
```
连接方式一种会在历史记录中留下mysql密码，更安全的方式是使用方式二。
####确认mysql中字符编码
```
mysql> status
--------------
mysql  Ver 14.14 Distrib 5.7.34, for Linux (x86_64) using  EditLine wrapper

Connection id:		8
Current database:
Current user:		root@localhost
SSL:			Not in use
Current pager:		stdout
Using outfile:		''
Using delimiter:	;
Server version:		5.7.34 MySQL Community Server (GPL)
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	latin1
Db     characterset:	latin1
Client characterset:	utf8
Conn.  characterset:	utf8
UNIX socket:		/var/lib/mysql/mysql.sock
Uptime:			1 day 27 min 38 sec

Threads: 1  Questions: 17  Slow queries: 0  Opens: 113  Flush tables: 1  Open tables: 106  Queries per second avg: 0.000
--------------
```
可以看到客户端和服务端字符编码都是utf8.也可以通过SHOW VARIABLES LIKE 'char%';来确认
```
mysql> SHOW VARIABLES LIKE 'char%';
+--------------------------+----------------------------+
| Variable_name            | Value                      |
+--------------------------+----------------------------+
| character_set_client     | utf8                       |
| character_set_connection | utf8                       |
| character_set_database   | latin1                     |
| character_set_filesystem | binary                     |
| character_set_results    | utf8                       |
| character_set_server     | latin1                     |
| character_set_system     | utf8                       |
| character_sets_dir       | /usr/share/mysql/charsets/ |
+--------------------------+----------------------------+
8 rows in set (0.01 sec)
```

##创建数据库
CREATE DATABASE 数据库名

```
mysql> create database db1;
Query OK, 1 row affected (0.00 sec)
```
####查询数据库
SHOW DATABASES;
```
mysql> SHOW DATABASES;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| db1                |
+--------------------+
2 rows in set (0.00 sec)
```
##指定数据库
```
mysql> use db1
Database changed
```

##显示当前数据库
SELECT DATABASE();
```
mysql> SELECT DATABASE();
+------------+
| DATABASE() |
+------------+
| db1        |
+------------+
1 row in set (0.00 sec)
```
##创建表
CREATE TABLE 表名 (列名1 数据类型1，列名2 数据类型2 ……）
```
mysql> CREATE TABLE tb1 (empid VARCHAR(10),name VARCHAR(10),age INT);
Query OK, 0 rows affected (0.53 sec)
```
##显示所有的表
```
mysql> SHOW TABLES;
+---------------+
| Tables_in_db1 |
+---------------+
| tb1           |
+---------------+
1 row in set (0.00 sec)
```

##指定字符编码创建表
```
mysql> CREATE TABLE tb2 (empid VARCHAR(10),name VARCHAR(10),age INT) CHARSET=utf8;
Query OK, 0 rows affected (0.55 sec)
```
当前由于默认字符编码是utf8，所以创建表不需要按照上面的设置来创建表。

https://dy.wmyun.men/link/TbCrfF1NzBHR6bT7?mu=2

##关系数据库
现在使用最为广泛的数据库是关系数据库(Relational DataBase,RDB)。
在关系型数据库中，一条数据用多少个项目来表示。例如关系型数据库将一条会员数据分成会员编号、姓名、住址和出生年月等项目，然后将各个会员的相关数据收集起来。
一条数据成为记录(record),各个项目成为列(column)，在刚才的例子中xxx先生的数据是记录，会员编号和姓名等项目是列。
如果想象成Excel的工作表(work sheet),横向的一行就相当于记录。注意，纵向的一列中输入的是相同类型的数据。
我们把手机了这些数据的表格称为表(table)。一个数据库中可以包括多个表。

##创建数据库
```
mysql> create DATABASE test;
Query OK, 1 row affected (0.02 sec)
```
Query OK提示成功，表示我们成功创建了数据库db1，数据库名和表名在Windows、Macos和linux上得处理方法并不相同，在windows和macOS环境中不区分字符的大小写，但是在Linux环境中却区分大小写。

##显示数据库
```
mysql> SHOW DATABASES;
+--------------------+
| Database           |
+--------------------+
| test                |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.00 sec)
```
mysql数据库是负责存储MySQL各种信息的数据库，它保存了管理用户信息的表user等。

##指定数据库
```
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
| test               |
+--------------------+
5 rows in set (0.00 sec)

mysql> use test
Database changed
mysql>
```
格式：use 数据库名
在使用use选择数据库的状态下也能够操作其他数据库中的表。这时可以像"数据库名.表名"这样把数据库名和表名用"."连接起来。例如，当从其他数据库访问数据库db2中的表table的所有记录时，可以使用下面的命令:
```
select * from db2.table;
```

##显示当前使用的数据库
```
mysql> select database();
+------------+
| database() |
+------------+
| test       |
+------------+
1 row in set (0.00 sec)
```

##启动时选择数据库
```
root@52coder:~# mysql test -u root -proot
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 11
Server version: 8.0.33-0ubuntu0.22.04.2 (Ubuntu)
Copyright (c) 2000, 2023, Oracle and/or its affiliates.
Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.
Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> select database();
+------------+
| database() |
+------------+
| test       |
+------------+
1 row in set (0.00 sec)
```

##创建表 &&显示表结构
```
mysql> create table employ (empid VARCHAR(10),name VARCHAR(10),age INT);
Query OK, 0 rows affected (0.04 sec)

mysql> DESC employ;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| empid | varchar(10) | YES  |     | NULL    |       |
| name  | varchar(10) | YES  |     | NULL    |       |
| age   | int         | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
3 rows in set (0.00 sec)
```
NULL表示允许不输入任何值，Default表示如果什么值都不输入就用这个值。Field表示列名，Type表示数据类型。

##显示所有的表
```
mysql> show tables;
+----------------+
| Tables_in_test |
+----------------+
| employ         |
+----------------+
1 row in set (0.00 sec)

mysql>
```

##创建表指定字符编码
```
mysql>create table employ (empid VARCHAR(10),name VARCHAR(10),age INT) CHARSET=utf8;
```

##插入数据
INSERT INTO 表名 VALUES(数据1,数据2);
```
mysql> desc employ;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| empid | varchar(10) | YES  |     | NULL    |       |
| name  | varchar(10) | YES  |     | NULL    |       |
| age   | int         | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
3 rows in set (0.00 sec)

mysql> insert into employ values('A101','jackma',50);
Query OK, 1 row affected (0.03 sec)
```
从表结构看name和empid被设置成了VARCHAR(10),所以我们无法输入多余10个字符的数据，但是在MySQL中，即使输入了多于指定字符数的数据也不会报错，而是会忽略无法插入的字符。

##指定列名插入记录
INSERT INTO 表名  (列名1,列名2,列名3) VALUES(数据1,数据2,数据3)
```
mysql> insert into employ (age,name,empid) VALUES(23,'马云','A104');
Query OK, 1 row affected (0.02 sec)
```

##一次性输入多条数据
INSERT INTO 表名  (列名1,列名2,列名3) VALUES(数据1,数据2,数据3),(数据1,数据2,数据3),(数据1,数据2,数据3),(数据1,数据2,数据3)
```
mysql> insert into employ (age,name,empid) VALUES(24,'马化腾','A105'),(28,'丁磊 ','A106'),(29,'李彦宏','A107');
Query OK, 3 rows affected (0.02 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql>
```

##显示数据
```
mysql> select * from employ;
+-------+-----------+------+
| empid | name      | age  |
+-------+-----------+------+
| A101  | jackma    |   50 |
| A104  | 马云      |   23 |
| A105  | 马化腾    |   24 |
| A106  | 丁磊      |   28 |
| A107  | 李彦宏    |   29 |
+-------+-----------+------+
5 rows in set (0.00 sec)
```

##使用SELECT输出指定的值
SELECT命令还能用于显示与数据库无关的值。比如：
```
mysql> select '测试' ;
+--------+
| 测试   |
+--------+
| 测试   |
+--------+
1 row in set (0.00 sec)
```
这种方法适用于确认函数的值或计算结果。例如：
```
mysql> select (2+3)*4;
+---------+
| (2+3)*4 |
+---------+
|      20 |
+---------+
1 row in set (0.00 sec)

mysql>
```

##复制表
```
mysql> select * from employ;
+-------+-----------+------+
| empid | name      | age  |
+-------+-----------+------+
| A101  | jackma    |   50 |
| A104  | 马云      |   23 |
| A105  | 马化腾    |   24 |
| A106  | 丁磊      |   28 |
| A107  | 李彦宏    |   29 |
+-------+-----------+------+
5 rows in set (0.00 sec)

mysql> create table employ1 select * from employ;
Query OK, 5 rows affected (0.03 sec)
Records: 5  Duplicates: 0  Warnings: 0

mysql> select * from employ1;
+-------+-----------+------+
| empid | name      | age  |
+-------+-----------+------+
| A101  | jackma    |   50 |
| A104  | 马云      |   23 |
| A105  | 马化腾    |   24 |
| A106  | 丁磊      |   28 |
| A107  | 李彦宏    |   29 |
+-------+-----------+------+
5 rows in set (0.00 sec)
```
使用命令CREATE  TABLE   table2 SELECT  *  FROM  table1;

##修改表
###修改列的数据类型
```
mysql> desc employ;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| empid | varchar(10) | YES  |     | NULL    |       |
| name  | varchar(10) | YES  |     | NULL    |       |
| age   | int         | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
3 rows in set (0.01 sec)

mysql> alter table employ modify name VARCHAR(100);
Query OK, 5 rows affected (0.06 sec)
Records: 5  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
3 rows in set (0.00 sec)
```
修改列的数据类型格式：
alter table 表名 modify 列名 数据类型;
注意：数据类型的修改必须具有兼容性，不具有兼容性的修改会导致错误发生。如果将VARCHAR(100)修改为VARCHAR(50)，第50个字符之后的数据就会丢失。
######添加列
添加列的格式：
alter table 表名 add 列名 数据类型
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
3 rows in set (0.00 sec)

mysql> alter table employ add birth DATETIME;
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
4 rows in set (0.01 sec)
```
###插入数据记录
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
3 rows in set (0.00 sec)

mysql> alter table employ add birth DATETIME;
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
4 rows in set (0.01 sec)

mysql> insert into employ VALUES('N1008','风清扬',25,'1991-08-03 22:00:00');
Query OK, 1 row affected (0.01 sec)

mysql> select * from employ;
+-------+-----------+------+---------------------+
| empid | name      | age  | birth               |
+-------+-----------+------+---------------------+
| A101  | jackma    |   50 | NULL                |
| A104  | 马云      |   23 | NULL                |
| A105  | 马化腾    |   24 | NULL                |
| A106  | 丁磊      |   28 | NULL                |
| A107  | 李彦宏    |   29 | NULL                |
| N1008 | 风清扬    |   25 | 1991-08-03 22:00:00 |
+-------+-----------+------+---------------------+
6 rows in set (0.00 sec)
```
由于birth是DATETIME类型，如果不输入时间，会被自动设置成"00:00:00"，即0点0分0秒。

###修改列的位置
####把列添加到最前面
格式：
alter table 表名 add 字段 类型 first;
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
4 rows in set (0.01 sec)

mysql> alter table employ add date DATE first;
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
5 rows in set (0.01 sec)
```
####把列添加到任意位置
格式：
alter table 表名 add 字段 类型 after empid;
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
5 rows in set (0.00 sec)

mysql> alter table employ add grade int after age;
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| grade | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
6 rows in set (0.00 sec)
```

####修改列的顺序
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| grade | int          | YES  |     | NULL    |       |
| birth | datetime     | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
6 rows in set (0.00 sec)

mysql> alter table employ modify birth datetime first;
Query OK, 0 rows affected (0.05 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| birth | datetime     | YES  |     | NULL    |       |
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| grade | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
6 rows in set (0.00 sec)
```
####修改列名和数据类型
alter table 表名 change 修改前的列名  修改后的列名  修改后的数据类型；
```
mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| grade | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
5 rows in set (0.00 sec)

mysql> alter table employ change date birthday datetime;
Query OK, 6 rows affected (0.05 sec)
Records: 6  Duplicates: 0  Warnings: 0

mysql> desc employ;
+----------+--------------+------+-----+---------+-------+
| Field    | Type         | Null | Key | Default | Extra |
+----------+--------------+------+-----+---------+-------+
| birthday | datetime     | YES  |     | NULL    |       |
| empid    | varchar(10)  | YES  |     | NULL    |       |
| name     | varchar(100) | YES  |     | NULL    |       |
| age      | int          | YES  |     | NULL    |       |
| grade    | int          | YES  |     | NULL    |       |
+----------+--------------+------+-----+---------+-------+
5 rows in set (0.00 sec)
```
####删除列
alter table 表名 drop 列名;
```
mysql> desc employ;
+----------+--------------+------+-----+---------+-------+
| Field    | Type         | Null | Key | Default | Extra |
+----------+--------------+------+-----+---------+-------+
| datetime | date         | YES  |     | NULL    |       |
| date     | date         | YES  |     | NULL    |       |
| empid    | varchar(10)  | YES  |     | NULL    |       |
| name     | varchar(100) | YES  |     | NULL    |       |
| age      | int          | YES  |     | NULL    |       |
| grade    | int          | YES  |     | NULL    |       |
+----------+--------------+------+-----+---------+-------+
6 rows in set (0.01 sec)

mysql> alter table employ drop datetime;
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc employ;
+-------+--------------+------+-----+---------+-------+
| Field | Type         | Null | Key | Default | Extra |
+-------+--------------+------+-----+---------+-------+
| date  | date         | YES  |     | NULL    |       |
| empid | varchar(10)  | YES  |     | NULL    |       |
| name  | varchar(100) | YES  |     | NULL    |       |
| age   | int          | YES  |     | NULL    |       |
| grade | int          | YES  |     | NULL    |       |
+-------+--------------+------+-----+---------+-------+
5 rows in set (0.00 sec)
```
##主键
创建唯一记录时，会给列设置一个用于和其他列进行区分的特殊属性。
在这种情况下需要用到的就是主键(PRIMARY KEY)。主键是在多条记录中用于确定一条记录时使用的标识符。主键的特点：
没有重复的值、不允许输入空值(NULL)
###创建主键
```
mysql> create table t_pk (a INT PRIMARY KEY,b VARCHAR(10));
Query OK, 0 rows affected (0.04 sec)

mysql> desc t_pk;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| a     | int         | NO   | PRI | NULL    |       |
| b     | varchar(10) | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
2 rows in set (0.00 sec)
```
通过desc t_pk可以看到a 的key类型是PRIMARY KEY,NULL(是否为NULL)为no，不允许输入空值。           

###确认主键
```
mysql> desc t_pk;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| a     | int         | NO   | PRI | NULL    |       |
| b     | varchar(10) | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
2 rows in set (0.00 sec)

mysql> insert into t_pk VALUES(10,'阿');
Query OK, 1 row affected (0.02 sec)

mysql> select * from t_pk;
+----+------+
| a  | b    |
+----+------+
| 10 | 阿   |
+----+------+
1 row in set (0.00 sec)

mysql> insert into t_pk(a) VALUES(10);
ERROR 1062 (23000): Duplicate entry '10' for key 't_pk.PRIMARY'
```
因为列a作为主键不允许输入重复的值'10'和空值NULL,所以重复时会有Duplicate entry 这样的报错。

###设置唯一键
```
mysql> create table t_uniq1(a INT UNIQUE,b VARCHAR(10));
Query OK, 0 rows affected (0.04 sec)

mysql> desc t_uniq;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| a     | int         | YES  | UNI | NULL    |       |
| b     | varchar(10) | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
2 rows in set (0.00 sec)

mysql> insert into t_uniq (a) VALUES(NULL);
Query OK, 1 row affected (0.02 sec)

mysql> select * from t_uniq;
+------+------+
| a    | b    |
+------+------+
| NULL | NULL |
+------+------+
1 row in set (0.00 sec)

mysql>
```
唯一键虽然不允许列中有重复值，但允许输入为NULL。

######使列具有自动连续编号功能
要使列具有自动连续编号功能，就得在定义列的时候进行以下3项设置：
数据类型必须要为INT TINYINT SMALLINT等整数类型
创建表格时需要指定AUTO_INCREMENT
设置PRIMARYKEY，使列具有唯一性

```
mysql> insert into t_series(b) VALUES('子');
Query OK, 1 row affected (0.02 sec)

mysql> insert into t_series(b) VALUES('丑');
Query OK, 1 row affected (0.00 sec)

mysql> insert into t_series(b) VALUES(' 寅');
Query OK, 1 row affected (0.01 sec)

mysql> select * from t_series;
+---+------+
| a | b    |
+---+------+
| 1 | 子   |
| 2 | 丑   |
| 3 | 寅   |
+---+------+
3 rows in set (0.00 sec)
```

###设置连续编号
```
mysql> select * from t_series;
+---+------+
| a | b    |
+---+------+
| 1 | 子   |
| 2 | 丑   |
| 3 | 寅   |
+---+------+
3 rows in set (0.00 sec)

mysql> delete from t_series;
Query OK, 3 rows affected (0.02 sec)

mysql> insert into t_series(b) VALUES('武');
Query OK, 1 row affected (0.02 sec)

mysql> select * from t_series;
+---+------+
| a | b    |
+---+------+
| 4 | 武   |
+---+------+
1 row in set (0.00 sec)

mysql> insert into t_series VALUES(10,'庚');
Query OK, 1 row affected (0.02 sec)

mysql> insert into t_series(b) VALUES('耄');
Query OK, 1 row affected (0.02 sec)

mysql> select * from t_series;
+----+------+
| a  | b    |
+----+------+
|  4 | 武   |
| 10 | 庚   |
| 11 | 耄   |
+----+------+
3 rows in set (0.00 sec)
```
如果把表中的所有记录都删除，然后重新输入记录，编号会从之前的最大值+1开始分配。
拥有自动连续编号功能的列还可以设置指定的值(唯一)，例列a中输入10，然后从11开始分配。
######初始化AUTO_INCREMENT的值
```
mysql> alter table t_series AUTO_INCREMENT=1;
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> select * from t_series;
+----+------+
| a  | b    |
+----+------+
|  4 | 武   |
| 10 | 庚   |
| 11 | 耄   |
+----+------+
3 rows in set (0.00 sec)

mysql> insert into t_series(b) VALUES('子');
Query OK, 1 row affected (0.02 sec)

mysql> insert into t_series(b) VALUES('丑');
Query OK, 1 row affected (0.01 sec)

mysql> select * from t_series;
+----+------+
| a  | b    |
+----+------+
|  4 | 武   |
| 10 | 庚   |
| 11 | 耄   |
| 12 | 子   |
| 13 | 丑   |
+----+------+
5 rows in set (0.00 sec)

mysql> alter table t_series AUTO_INCREMENT=100;
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> insert into t_series(b) VALUES('正');
Query OK, 1 row affected (0.01 sec)

mysql> select * from t_series;
+-----+------+
| a   | b    |
+-----+------+
|   4 | 武   |
|  10 | 庚   |
|  11 | 耄   |
|  12 | 子   |
|  13 | 丑   |
| 100 | 正   |
+-----+------+
6 rows in set (0.00 sec)
```
当表中存在数据时，如果设置的编号值比已经存在的值大，也可以通过上面的语句重新设置编号的初始值。如果设置的编号初始值比当前已存在的最大值大，则设置不生效。


###设置列的默认值
```
mysql> create table tb1G (empid VARCHAR(10),name VARCHAR(10),age INT) CHARSET=utf8;
Query OK, 0 rows affected, 1 warning (0.03 sec)

mysql> desc tb1G;
+-------+-------------+------+-----+---------+-------+
| Field | Type        | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+-------+
| empid | varchar(10) | YES  |     | NULL    |       |
| name  | varchar(10) | YES  |     | NULL    |       |
| age   | int         | YES  |     | NULL    |       |
+-------+-------------+------+-----+---------+-------+
3 rows in set (0.01 sec)

mysql> alter table tb1G MODIFY name VARCHAR(10) DEFAULT '未输入姓名';
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc tb1G;
+-------+-------------+------+-----+-----------------+-------+
| Field | Type        | Null | Key | Default         | Extra |
+-------+-------------+------+-----+-----------------+-------+
| empid | varchar(10) | YES  |     | NULL            |       |
| name  | varchar(10) | YES  |     | 未输入姓名      |       |
| age   | int         | YES  |     | NULL            |       |
+-------+-------------+------+-----+-----------------+-------+
3 rows in set (0.00 sec)
```
如果插入数据时不指定name，查看name中的值。
```
mysql> insert into tb1G(empid,age) VALUES('64871',27);
Query OK, 1 row affected (0.02 sec)

mysql> select * from tb1G;
+-------+-----------------+------+
| empid | name            | age  |
+-------+-----------------+------+
| 64871 | 未输入姓名      |   27 |
+-------+-----------------+------+
1 row in set (0.00 sec)
```
##创建索引
当查找表中的数据时，如果数据量过大，查找操作就会花费很多时间。如果实现在表上创建了索引，查找时就不用对全表进行扫描，而是利用索引进行扫描。
```
mysql> create index my_ind on tb1G(empid);
Query OK, 0 rows affected (0.05 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> show index from tb1G;
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
| Table | Non_unique | Key_name | Seq_in_index | Column_name | Collation | Cardinality | Sub_part | Packed | Null | Index_type | Comment | Index_comment | Visible | Expression |
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
| tb1G  |          1 | my_ind   |            1 | empid       | A         |           1 |     NULL |   NULL | YES  | BTREE      |         |               | YES     | NULL       |
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+------------+
1 row in set (0.03 sec)

mysql> show index from tb1G \G
*************************** 1. row ***************************
        Table: tb1G
   Non_unique: 1
     Key_name: my_ind
 Seq_in_index: 1
  Column_name: empid
    Collation: A
  Cardinality: 1
     Sub_part: NULL
       Packed: NULL
         Null: YES
   Index_type: BTREE
      Comment:
Index_comment:
      Visible: YES
   Expression: NULL
1 row in set (0.01 sec)

mysql>
```
##删除索引
```
mysql> drop index my_ind on tb1G;
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> show index from tb1G \G
Empty set (0.00 sec)

mysql>
```
##索引和处理速度
创建了索引并不代表一定会缩短查找时间，因为根据查找条件的不同，有时候不需要用到索引，而且在某些情况下，使用索引反而会花费更多的时间。

如果相同的值较多的情况下最好不要创建索引，当某列只有'YES'和'NO'这两个值，即使在该列上创建索引页不会提高处理速度。当对创建了索引的表进行更新时，也需要对已经存在的索引信息进行维护，所以，在使用索引的情况下，检索速度可能会变快，但与此同时，更新速度页很可能会变慢。

#####查看已创建表的信息
```
mysql> show create table employ;
+--------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Table  | Create Table                                                                                                                                                                                                                                                |
+--------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| employ | CREATE TABLE `employ` (
  `birthday` datetime DEFAULT NULL,
  `empid` varchar(10) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `grade` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci |
+--------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
1 row in set (0.00 sec)

mysql> show table status from test where name='employ' \G
*************************** 1. row ***************************
           Name: employ
         Engine: InnoDB
        Version: 10
     Row_format: Dynamic
           Rows: 6
 Avg_row_length: 2730
    Data_length: 16384
Max_data_length: 0
   Index_length: 0
      Data_free: 0
 Auto_increment: NULL
    Create_time: 2023-07-23 11:26:17
    Update_time: NULL
     Check_time: NULL
      Collation: utf8mb4_0900_ai_ci
       Checksum: NULL
 Create_options:
        Comment:
1 row in set (0.02 sec)

一种更简单的查询方式：
mysql> show create table employ\G
*************************** 1. row ***************************
       Table: employ
Create Table: CREATE TABLE `employ` (
  `birthday` datetime DEFAULT NULL,
  `empid` varchar(10) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `grade` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```