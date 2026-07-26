---
layout: post
title: "Concurrency for System Design with Microsoft Engineer"
date: 2026-07-25 21:54:41 -0000
category: System Design
tags: [system_design, architecture, infrastructure]
description: "Prevent double booking with optimistic vs pessimistic concurrency: race condition solutions in Postgres, Redis and MongoDB for system design interviews."
thumbnail: /assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/logo.png
thumbnailwide: /assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/logo-wide.png
---

* TOC
{:toc}

<br>

## **Introduction**

I passed many System Design interviews in FAANG companies myself, and conducted around 40-50 of them. Today we are going to talk about one of the core problems that you are going to face during a system design interview - concurrency and race conditions.

Good thing - this knowledge is not “interview-specific”, but usually you would apply it in a real world scenario while developing/fixing/investigating something.

We are going to consider multiple SQL and NoSQL storages, so that you have all the technology detailed solutions.




<br>

## **The problem**

Let’s consider the most typical scenario: Ticketmaster, Ryanair/Kiwi, Uber. The general case: two users might want to book/lock the same resource (seat, ticket, rider) -> we should allow only one of them to do so, and let the other one see the error and retry. Correctness breaks if two users both think they got the seat/ticket/rider whereas in fact only one of them has it.

In our case we will take the Ticketmaster as an example, as it is the most representative. We have an entity `Seat`, that has id (unique), status (available, reserved), reserved_by (the user that has reserved), version (part of concurrency mechanism). 
 
In SQL it would look like that:

```sql
CREATE TABLE IF NOT EXISTS seats (
    id           INT  PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'available',
    reserved_by  TEXT,
    version      INT  NOT NULL DEFAULT 0
);
```

Set up the single available seat: 
 
```sql
INSERT INTO seats (id, status, reserved_by, version)
VALUES (1, 'available', NULL, 0)
ON CONFLICT (id) DO UPDATE
    SET status = 'available', reserved_by = NULL, version = 0;
```

Apparently we might have 2 or more people trying to book the same seat. We want to ensure only one of them is taking the seat and others see the error. If 2 people booked and paid for the same seat we will have a correctness anomaly called `double booking`.

A typical answer that I hear from a candidate: “well, we read the seat from db, check the status and change status to reserved if it is free, DB will handle everything“. This is the so-called `read-modify-write` (RMW) operation. So…. will db handle everything actually?

You can go straight to the "Recipe" chapter to get the summary of what you must pick depending on the usecase, or check the Postgres, Redis and MongoDB section that explain internally how it exactly works.

Please note, you might see that the "version" field is not used anywhere, and instead of this we are using status as our domain allows us to. Sometimes this will not be the case -> so instead you have an additional "race conditions" field that can be used for this purpose.


<br>

## **Pessimistic vs Optimistic concurrency**

General rule for system design - whenever you can consider two options and compare (trade offs) and make a decision in favor of one of them - DO IT.

A trade offs discussion is the one that actually gives you a green flag in the interview, especially when you have good points and you make a good conclusion in the end.

The solution to the original problem is to use either optimistic or pessimistic concurrency. Now which one to use, how do they work?

Of course, no system design can go without Martin Kleppmann’s book, here is one of the best tradeoff explanations:


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image2.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image2.png "image_tooltip"){:target="_blank"}


Remember, these are two main reasons (there are others for sure):



* `high contention` (a lot of threads/processes try to write to EXACTLY SAME row/document/key) -> pessimistic. Locking cost is smaller than retries cost
* `low contention` (just a few threads/processes try to write to EXACTLY SAME row/document/key) -> optimistic, as locking cost is bigger than retries cost on edge cases.


One important caveat: optimistic concurrency normally assumes the loser retries the operation a couple of times. This is not the case for seat/ticket booking (Ticketmaster, Uber, Ryanair) - once a seat is reserved by someone else, there is nothing to retry - the row won't become free for the next 10 minutes.
So in our case, there is no "retry cost" which means we can say that optimistic concurrency is the way to go for us


<br>

## **Postgres**

First, we need to understand what “race conditions” model Postgres uses (it is always about specific DB, you cannot assume the same for all SQL databases).




<br>

### **MVCC - Multiversion concurrency control**

There are a bunch of ways for storage to keep thread safe operations:



* 2PL (Two-Phase Locking) - classic shared read lock vs exclusive write lock. Readers block writers, writers block readers.
* MVCC (multiversion concurrency control) - multiple versions of a row might exist at one point in time, readers don't block other readers, readers don't block writers. Writers are using pessimistic locking or optimistic CAS for concurrent updates
* Be single threaded

Postgres uses MVCC (Multi-version concurrency control) as a concurrency mechanism. Essentially it means that it keeps MULTIPLE versions for the same object/row at a point of time. Transactions can then decide which version they “see”.

Note though [0]:



* **internal writes** inside Postgres (the actual c code that writes to the memory) are done via exclusive locking only, there is no optimistic concurrency. SQL level write statements (e.g. UPDATE, DELETE) are exclusively locked as well, and executed one at a time for the same row. Therefore: whenever 2 transactions in parallel try to update the same row - one will be blocked until the other one is done. We still might have optimistic concurrency as the result of that update: error or success.
* **internal reads** (the actual c code that reads memory), on the other hand, are never blocked (in any isolation level, except SELECT FOR UPDATE that is using a write lock, same as for UPDATE, DELETE, etc). The concurrent reads are organized around “what the current transaction can see”, as the row has all the potential versions.


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image10.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image10.png "image_tooltip"){:target="_blank"}


Having mentioned this, now we can implement “optimistic” and “pessimistic” locking on the sql statement level.

In general, every transaction has a snapshot, which is the state of ongoing transactions, rows that are affected, etc. The difference between isolation levels is when this snapshot is taken, and how much information we assess in this snapshot.

Small “underhood”: Postgres operates on tuples. A tuple is the version of a row (along with the data, to put it simply). If there is another version of the row, postgres creates a new tuple and points the first one to the second one in a similar to Linked List fashion. The “next” pointer is named `t_ctid` and it points to “newer” tuple, or to itself if there is only a single version of tuple.

Example:


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image11.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image11.png "image_tooltip"){:target="_blank"}


Let’s briefly discuss what is going on in a simple UPDATE statement in different Isolation levels for Postgres:



* `READ UNCOMMITTED isolation` - does not exist in postgres, behaves exactly like READ COMMITTED.
* `READ COMMITTED isolation` - every single statement calculates the fresh “snapshot” of the rows. That’s exactly how two different SELECTs for the same row might return different results. As mentioned above UPDATE locks the row exclusively, and then postgres re-reads the same row (while exclusively keeping the UPDATE lock) via EPQ[1] and then evaluates the UPDATE … WHERE criteria over the freshly fetched row. This is where lost update can happen, and where we might have double booking.
[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image23.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image23.png "image_tooltip"){:target="_blank"}

* `REPEATABLE READ (SNAPSHOT) isolation` - the snapshot is taken at the beginning of the transaction (not before each statement as in READ COMMITTED). All SELECT statements for a single row see the same result in the transaction. UPDATE statement just detects whether there is a newer version of the row or not, if somebody has updated the row, the transaction will see a newer tuple in MVCC, and abort the UPDATE [2] [3].

    
[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image16.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image16.png "image_tooltip"){:target="_blank"}



    
[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image13.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image13.png "image_tooltip"){:target="_blank"}


* `SERIALIZABLE` - works pretty similarly to REPEATABLE READ except that it maintains the reads made by transactions, and aborts the current one in case there is a transaction that creates dangerous situations e.g. updates the row that was read by a transaction that is going to change that row, because it might lead to anomalies that are still allowed in REPEATABLE READ. Essentially, whenever there is an UPDATE statement (that PG tries to commit), SERIALIZABLE checks not only whether there is a newer version of the row, but also whether it was read by someone.

Rollback works in the way that Postgres writes ROLLBACK messages to WAL, adds that transaction id to `clog` and that’s it. During the read postgres just checks the transaction status in clog.

To commit - we essentially don’t do anything, just add a commit message to WAL.




<br>

### **Vanilla READ COMMITTED - double booking**

Consider this example:

```sql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

SELECT id, status FROM seats WHERE id = 1;
UPDATE seats SET status = 'reserved', reserved_by = 'ALICE' WHERE id = 1;

COMMIT;
```


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image6.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image6.png "image_tooltip"){:target="_blank"}


Since we are using READ COMMITTED - each statement will capture a fresh snapshot, moreover, the UPDATE statement will do EvalPlanQual [1] (re-reading the row while holding the write lock by UPDATE, in case it sees that the row has been changed). 

That means the following scenario can happen:



* transaction1 selects the seat and checks in the application code that it is “available”
* transaction2 does the same
* transaction1 does an update statement (EvalPlanQual is NOT performed as row is up-to-date). Update is successful - we proceed with the payment
* transaction2 does an update (EvalPlanQual returns CHANGED by transaction1 status = “reserved”, but it does not stop us as it matches the WHERE statement of the UPDATE) successfully thus overriding transaction1. We proceed with the payment
* Result: double booking


```cs
    public async Task<SeatLockResult> LockSeatDirtyWriteAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        var seat = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
            "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId",
            new { seatId }, tx, cancellationToken: ct));

        if (seat is null)
            throw new InvalidOperationException($"Seat {seatId} does not exist.");

        if (seat.Status != "available")
        {
            await tx.RollbackAsync(ct);
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);
        }

        // THE BUG: the WHERE clause only matches on id, not status. Between the SELECT above and
        // this UPDATE another caller can reserve the seat; we overwrite them anyway. The row count
        // check below looks defensive but is useless here - keyed on id alone, the UPDATE always
        // hits exactly 1 row, so `rows` can never surface the conflict. Lost update.
        var rows = await conn.ExecuteAsync(new CommandDefinition(
            "UPDATE seats SET status = 'reserved', reserved_by = @customer, version = version + 1 WHERE id = @seatId",
            new { customer, seatId }, tx, cancellationToken: ct));

        if (rows != 1)
        {
            // Never reached in practice - kept to show that even a row-count guard doesn't catch it.
            await tx.RollbackAsync(ct);
            return new SeatLockResult(SeatLockOutcome.Conflict, null, -1);
        }

        await tx.CommitAsync(ct);
        return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);
    }
```


<br>

### **Optimistic READ COMMITTED - no double booking**

To improve the situation above - we can leverage EvalPlanQual and recheck that the seat has the expected value that we have read via SELECT before.

Now the steps would be:



* transaction1 selects the seat and checks in the application code that it is “available”
* transaction2 does the same
* transaction1 does an update statement (EvalPlanQual is NOT performed as the row has not been changed yet). Update is successful - we proceed with the payment
* transaction2 does an update (EvalPlanQual returns CHANGED by transaction1 status = “reserved”, the WHERE statement “does not match” by status as it HAS BEEN CHANGED by transaction1 already) unsuccessfully as no rows were matched. We return an error.
* Result: NO double booking

Literally the fix is `AND status = @status` + ensure code checks `affected rows`.



```cs
    public async Task<SeatLockResult> LockSeatOptimisticAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct); // READ COMMITTED

        var seat = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
            "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId",
            new { seatId }, tx, cancellationToken: ct));

        if (seat is null)
            throw new InvalidOperationException($"Seat {seatId} does not exist.");

        if (seat.Status != "available")
        {
            await tx.RollbackAsync(ct);
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);
        }

        // Compare-and-swap: only succeeds if the status is still what we read.
        var rows = await conn.ExecuteAsync(new CommandDefinition(
            """
            UPDATE seats
               SET status = 'reserved', reserved_by = @customer, version = version + 1
             WHERE id = @seatId AND status = @status
            """,
            new { customer, seatId, seat.Status }, tx, cancellationToken: ct));

        if (rows == 1)
        {
            await tx.CommitAsync(ct);
            return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);
        }

        // rows == 0 -> the winner committed between our SELECT and our UPDATE. Re-read (new statement,
        // new snapshot) to report who holds the seat, then roll back - we wrote nothing.
        var winner = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
            "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId",
            new { seatId }, tx, cancellationToken: ct));

        await tx.RollbackAsync(ct);
        return new SeatLockResult(
            SeatLockOutcome.AlreadyTaken, winner?.ReservedBy, winner?.Version ?? seat.Version + 1);
    }
```


<br>

### **Pessimistic READ COMMITTED - no double booking**

Another option here would be to put a WRITE lock on the row and work with it exclusively. Since Postgres by default uses MVCC and thus reads don’t put any lock on the row - we must use `SELECT FOR UPDATE` that essentially puts a write lock on the rows for the transaction duration.

In that case you don’t have to add `AND status = @status` as Postgres ensures nothing will change that row while it is locked by `SELECT FOR UPDATE`.


```cs
    public async Task<SeatLockResult> LockSeatPessimisticAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        // FOR UPDATE acquires an exclusive row lock that is held until COMMIT/ROLLBACK.
        var seat = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
            "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId FOR UPDATE",
            new { seatId }, tx, cancellationToken: ct));

        if (seat is null)
            throw new InvalidOperationException($"Seat {seatId} does not exist.");

        if (seat.Status != "available")
        {
            // By the time we got the lock, the winner had already reserved it.
            await tx.RollbackAsync(ct);
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);
        }

        await conn.ExecuteAsync(new CommandDefinition(
            "UPDATE seats SET status = 'reserved', reserved_by = @customer, version = version + 1 WHERE id = @seatId",
            new { customer, seatId }, tx, cancellationToken: ct));

        await tx.CommitAsync(ct); // releasing the lock lets the next caller proceed
        return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);
    }
```


<br>

### **SERIALIZABLE / REPEATABLE READ - no double booking**

REPEATABLE READ and SERIALIZABLE are pretty similar - they both take a snapshot at the beginning of the transaction, compared to READ COMMITTED that takes a snapshot before each statement inside the transaction.

They both don’t do EvalPlanQual (compared to READ COMMITTED that does it), instead they detect the conflict on update.

Whenever UPDATE is happening in REPEATABLE READ or SERIALIZABLE [this code detects whether the tuple is already updated by somebody else](https://github.com/postgres/postgres/blob/master/src/backend/access/heap/heapam.c#L3683-L3689) (if t_ctid points to newer tuple), and [this code rejects UPDATE for modified tuple for REPEATABLE READ+](https://github.com/postgres/postgres/blob/master/src/backend/executor/nodeModifyTable.c#L2884-L2892).

This means that we can easily use the same code as in Vanilla READ COMMITTED version, but in REPEATABLE READ / SERIALIZABLE and it will work (you will need to catch the 40001 error and retry).

```cs
    public async Task<SeatLockResult> LockSeatRepeatableReadAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(
            System.Data.IsolationLevel.RepeatableRead, ct);

        try
        {
            var seat = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
                "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId",
                new { seatId }, tx, cancellationToken: ct));

            if (seat is null)
                throw new InvalidOperationException($"Seat {seatId} does not exist.");

            if (seat.Status != "available")
            {
                await tx.RollbackAsync(ct);
                return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);
            }

            // Unconditional write - no status guard. Under REPEATABLE READ this is still safe:
            // if a concurrent txn committed a change to this row after our snapshot, the UPDATE
            // fails with 40001 instead of clobbering it.
            await conn.ExecuteAsync(new CommandDefinition(
                "UPDATE seats SET status = 'reserved', reserved_by = @customer, version = version + 1 WHERE id = @seatId",
                new { customer, seatId }, tx, cancellationToken: ct));

            await tx.CommitAsync(ct);
            return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.SerializationFailure)
        {
            // We lost the race: another transaction committed first. Roll back the aborted transaction,
            // then read the winner on a fresh snapshot in a transaction of its own.
            await tx.RollbackAsync(ct);

            await using var readTx = await conn.BeginTransactionAsync(
                System.Data.IsolationLevel.RepeatableRead, ct);

            var winner = await conn.QuerySingleOrDefaultAsync<SeatRow>(new CommandDefinition(
                "SELECT id, status, reserved_by, version FROM seats WHERE id = @seatId",
                new { seatId }, readTx, cancellationToken: ct));

            await readTx.CommitAsync(ct);
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, winner?.ReservedBy, winner?.Version ?? -1);
        }
    }
```



<br>

## **Redis**

One of the great solutions to this problem - Distributed Lock pattern, which is quite commonly advised, even though being [roasted by Martin Kleppmann](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html).

One thing about classic Redis - it is single threaded - therefore the statements/commands are executed sequentially by default.




<br>

### **Vanilla SET - double booking**

Even though Redis is single-threaded, with wrong usage we might end up having double booking, for example:



* application code reads seat1 key
* it sees that status is “free”
* application decides to write value “reserved”

The problem here is that there might be a lot of other processes/threads that read seat1 as “free” and decided to write “reserved” thus believing they own the seat and proceeding with the payment.


```cs
    public async Task<SeatLockResult> LockSeatNaiveSetAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();

        var current = await db.StringGetAsync(Key(seatId));
        if (current.HasValue)
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, current.ToString(), 1);

        // THE BUG: nothing guards this SET. Between the GET above and here, another caller can reserve
        // the seat; we overwrite them regardless. No NX, no CAS -> last writer wins -> lost update.
        // Boolean returned by StringSet is always True for default SET.
        await db.StringSetAsync(Key(seatId), customer);
        return new SeatLockResult(SeatLockOutcome.Reserved, customer, 1);
    }
```


<br>

### **LUA script - no double booking**

A LUA script is some sort of “transaction” in the Redis world. Since Redis is single-threaded it will execute every LUA code atomically [4], meaning nothing else on the server is getting executed at the same time.


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image20.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image20.png "image_tooltip"){:target="_blank"}


LUA scripts don’t have a rollback option, but we don’t need it.


```cs
    private const string LuaLockSeat = """
        if redis.call('EXISTS', KEYS[1]) == 0 then
            redis.call('SET', KEYS[1], ARGV[1])
            return {1, ARGV[1]}
        else
            return {0, redis.call('GET', KEYS[1])}
        end
        """;
        
    public async Task<SeatLockResult> LockSeatLuaAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();

        var raw = await db.ScriptEvaluateAsync(
            LuaLockSeat,
            new RedisKey[] { Key(seatId) },
            new RedisValue[] { customer });

        var parts = (RedisResult[])raw!;
        var won = (long)parts[0] == 1;
        var holder = (string?)parts[1];

        return won
            ? new SeatLockResult(SeatLockOutcome.Reserved, holder, 1)
            : new SeatLockResult(SeatLockOutcome.AlreadyTaken, holder, 1);
    }
```

It will work, however we are using vanilla `SET` as in the previous chapter, but the key point here is that “exists” happens in a non-race environment, one at a time and in the server that is the source of truth.




<br>

### **SET NX - no double booking**

Atomic operation that sets the key ONLY if it does not exist at the moment. Redis does not use any specific atomic CPU instruction like CAS/FAA/TAS, instead it leverages the fact of being single-threaded and just checks it via simple `if` [5].


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image4.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image4.png "image_tooltip"){:target="_blank"}


```cs
    public async Task<SeatLockResult> LockSeatSetNxAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();

        var won = await db.StringSetAsync(Key(seatId), customer, when: When.NotExists);
        if (won)
            return new SeatLockResult(SeatLockOutcome.Reserved, customer, 1);

        var holder = await db.StringGetAsync(Key(seatId));
        return new SeatLockResult(SeatLockOutcome.AlreadyTaken, holder.ToString(), 1);
    }
```

Note though that this model works without status itself. The status is inferred from the fact whether the key exists or not.



<br>

## **MongoDB**

As the last part - let’s consider a typical Postgres alternative: MongoDb.

By default MongoDb uses a “WiredTiger” storage engine that uses MVCC [6], just like Postgres. The optimistic concurrency is per document, but in our case one seat = one document.


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image24.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image24.png "image_tooltip"){:target="_blank"}





<br>

### **MVCC - Multiversion concurrency control**

In my opinion, Mongodb (WiredTiger) has a much more intuitive MVCC approach than Postgres.

There is a map where the key is the id of the document and the value is a LinkedList of `__wt_update` structs, which contain the transaction id of the written value, timestamps and the pointer to the older version of the document [7].


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image15.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image15.png "image_tooltip"){:target="_blank"}



[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image18.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image18.png "image_tooltip"){:target="_blank"}


It is similar to Postgres, but Postgres keeps the older tuple on the head of the linked list, whereas mongo keeps the newest one on the head of the linked list.

While reading the value Mongo computes the snapshot (that has uncommitted transaction ids, min/max of visibility for transactions, etc), gets the head of the MVCC linked list, and gets the highest (newest) transaction id that is visible for that snapshot -> works with that.

On write/update - it simply tries to push a new head (version) to the linked list via CAS [8] [9] (lock free atomic compare-and-swap), as this is just a pointer (integer). The failed transaction will reread the newly inserted head and recheck on the “find criteria” whether it still matches before updating and retrying. An interesting distinction from Postgres is that nothing is locked here, so 3 concurrent transactions will all be doing CAS and exponential backoff.


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image1.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image1.png "image_tooltip"){:target="_blank"}



[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image8.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image8.png "image_tooltip"){:target="_blank"}


Rollback works in the way that you mark the transaction id as aborted, and then Mongo marks all the linked list entries from this transaction as aborted (they will be skipped).

To commit - we essentially don’t do anything, just add a commit message to WAL.




<br>

### **Vanilla Update - double booking**


```cs
    public async Task<SeatLockResult> LockSeatNaiveAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        var seat = await _seats.Find(s => s.Id == seatId).FirstOrDefaultAsync(ct);

        if (seat is null)
            throw new InvalidOperationException($"Seat {seatId} does not exist.");

        if (seat.Status != "available")
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);

        // THE BUG: filter keys on _id alone, with no status/version guard. Another caller can reserve
        // the seat between the find above and this update; we overwrite them anyway. Lost update.
        var update = Builders<SeatDoc>.Update
            .Set(s => s.Status, "reserved")
            .Set(s => s.ReservedBy, customer)
            .Inc(s => s.Version, 1);

        await _seats.UpdateOneAsync(s => s.Id == seatId, update, cancellationToken: ct);
        return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);
    }
```

Assume two concurrent threads (Alice and Bob) are writing to that document. Mongo’s CAS will allow only a single one to succeed (Alice), BUT the second one (Bob) will retry (as optimistic concurrency) and succeed -> double booking.

It is happening because after Mongo gets a CAS error (somebody else has updated the document) it refetches the fresh version and rechecks whether the “filter criteria” still matches for that document [10]. Our filter criteria is `Id == seatId` and it fully matches, therefore a new update will happen. It is very similar to Postgres’ EvalPlanQual in READ COMMITTED.


[![alt_text](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image5.png "image_tooltip")](/assets/2026-07-25-concurrency-for-system-design-with-microsoft-engineer/image5.png "image_tooltip"){:target="_blank"}





<br>

### **Update with status check - no double booking**

Since Mongo will recheck the entry once CAS fails on race conditions -> we can just add “status” to our criteria and check "updated rows", so that it will stop matching once somebody else reserves the seat.


```cs
    public async Task<SeatLockResult> LockSeatAtomicAsync(
        int seatId, string customer, CancellationToken ct = default)
    {
        var seat = await _seats.Find(s => s.Id == seatId).FirstOrDefaultAsync(ct);

        if (seat is null)
            throw new InvalidOperationException($"Seat {seatId} does not exist.");

        if (seat.Status != "available")
            return new SeatLockResult(SeatLockOutcome.AlreadyTaken, seat.ReservedBy, seat.Version);

        // Compare-and-swap: the update only lands while the seat is still 'available'. Because the
        // transition is one-way (available -> reserved), the status guard alone is enough - the loser's
        // filter matches 0 docs once the winner flips it. (A version guard would additionally cover the
        // ABA case where a seat bounces reserved -> available -> reserved between our read and write,
        // which this flow never does.)
        var filter = Builders<SeatDoc>.Filter.And(
            Builders<SeatDoc>.Filter.Eq(s => s.Id, seatId),
            Builders<SeatDoc>.Filter.Eq(s => s.Status, "available"));

        var update = Builders<SeatDoc>.Update
            .Set(s => s.Status, "reserved")
            .Set(s => s.ReservedBy, customer)
            .Inc(s => s.Version, 1);

        var result = await _seats.UpdateOneAsync(filter, update, cancellationToken: ct);

        if (result.ModifiedCount == 1)
            return new SeatLockResult(SeatLockOutcome.Reserved, customer, seat.Version + 1);

        // ModifiedCount == 0 -> someone else won the CAS. Re-read to report the winner.
        var winner = await _seats.Find(s => s.Id == seatId).FirstOrDefaultAsync(ct);
        return new SeatLockResult(
            SeatLockOutcome.AlreadyTaken, winner?.ReservedBy, winner?.Version ?? seat.Version + 1);
    }
```



<br>

## **Recipe tl; dr;**

Avoid straightforward `read-modify-write` (RMW) cycles that have the “modify” step in application code (service) but read and write against the real storage.

Instead “understand” whether the seat is reserved (“read” step) by trying to write to storage and check the result of that write (essentially do read-modify-write but all three in storage, which can handle it).

Another approach is to leverage the storage’s native concurrency approaches (pessimistic / optimistic) like pessimistic locking (SELECT FOR UPDATE in postgres), single threaded (LUA or SET NX in Redis) or Optimistic CAS (update with correct filter criteria in Mongo).


<br>

## **Conclusion**

I hope this article was interesting and useful for you. 

Attentive readers already saw that the approach here would work only for single row races, and it mostly wouldn’t work on classic Aggregation problems e.g. “take a doctor shift only if the number of doctors is less than X”. This is for future content. 
 
Please follow me on social media as I’m solving and discussing System Design / Leetcode and FAANG life there: [Telegram](https://t.me/programming_space), [Instagram](https://www.instagram.com/andreyka26_se/), [Threads](https://www.threads.com/@andreyka26_se), [X](https://x.com/andreyka26_).

The repository with examples: [https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/Concurrency](https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/Concurrency)




<br>

## **Sources**

[0] - [Serializable Isolation Implementation Strategies](https://github.com/postgres/postgres/blob/master/src/backend/storage/lmgr/README-SSI)

[1]  - [EvalPlanQual (READ COMMITTED Update Checking)](https://github.com/postgres/postgres/blob/master/src/backend/executor/README)

[2] - [Repeatable read and Serializable detecting the modified row has changed](https://github.com/postgres/postgres/blob/master/src/backend/access/heap/heapam.c#L3683-L3689)

[3] - [Repeatable read and Serializable rejecting “modified” row](https://github.com/postgres/postgres/blob/master/src/backend/executor/nodeModifyTable.c#L2884-L2892)

[4] - [Redis has LUA scripts atomic](https://redis.io/docs/latest/develop/programmability/eval-intro/#:~:text=Redis%20guarantees%20the%20script%27s%20atomic%20execution.%20While%20executing%20the%20script%2C%20all%20server%20activities%20are%20blocked%20during%20its%20entire%20runtime.%20These%20semantics%20mean%20that%20all%20of%20the%20script%27s%20effects%20either%20have%20yet%20to%20happen%20or%20had%20already%20happened)

[5] -[ Redis SET NX source code via simple if](https://github.com/redis/redis/blob/e1cc3dc268a5ff20eecbdb530483fd692c3dbc6e/src/t_string.c#L104-L112)

[6] - [WiredTiger docs](https://www.mongodb.com/docs/manual/core/wiredtiger/)

[7] - [WiredTiger MVCC linked list entry](https://github.com/wiredtiger/wiredtiger/blob/f08bc4b18612ef95a39b12166abcccf207f91596/src/include/btmem.h#L1063)

[8] - [CAS used in Updating the document in WiredTiger](https://github.com/wiredtiger/wiredtiger/blob/f9d25c772e4c4a6e5a2b831641cdade4647ef364/src/include/serial_inline.h#L276)

[9] - [CAS (compare-and-swap) implementation in WiredTiger](https://github.com/wiredtiger/wiredtiger/blob/f8cb8f23fb1bc4a41ce529a44755c41f2cfdd9a9/src/include/gcc.h#L101)

[10] - [Mongo checks “doc still matches” before the update](https://github.com/mongodb/mongo/blob/3a871fc6471335817b6ac1b913a47a504b3743b0/src/mongo/db/exec/classic/update_stage.cpp#L229)

<br>

## **Technical Reviewers**

* Bohdan Bilokon, [LinkedIn](https://www.linkedin.com/in/bohdan-bilokon/)