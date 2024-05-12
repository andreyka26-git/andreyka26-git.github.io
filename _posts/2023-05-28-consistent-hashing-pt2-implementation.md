---
layout: post
title: "Consistent Hashing pt2: Implementation"
date: 2023-05-28 11:02:35 -0000
category: ["Distributed Systems"]
tags: [distributed-cache, consistent-hashing, distributed-systems]
description: "In this article we are going to implement and discuss Consistent Hashing algorithm for Partitioning databases or Distributed Caches, we will do similar architecture as MongoDB did underhood. Using Consistent Hashing we will implement automatic rebalancing of distributed cache to separate server that we will spin in runtime."
thumbnail: /assets/2023-05-28-consistent-hashing-pt2-implementation/logo.png
thumbnailwide: /assets/2023-05-28-consistent-hashing-pt2-implementation/logo-wide.png
---
<br>

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 16

Conversion time: 5.96 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Tue May 30 2023 17:55:55 GMT-0700 (PDT)
* Source doc: Consistent Hashing pt2: Implementation
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

In this article, `we will implement a Consistent Hashing` algorithm along with a simple `Distributed Cache`. 

Our implemented Distributed Cache will use [Partitioning](https://en.wikipedia.org/wiki/Partition_(database)) [2] for the distribution of the load. It will be able to rebalance automatically (dynamic rebalancing) when some node is overloaded (memory-wise) using the `Consistent Hashing` technique. On top of that, we will implement the creation of a new Partition Node during runtime.

We will use .NET for this, but actually, you can implement it in any language that supports HTTP request handling and operating system process creation.

Highly recommended to read the [previous article](https://andreyka26.com/consistent-hashing-pt1-theory) about the `Consistent Hashing` algorithm, different approaches and representations of this technique, and an overview of the first Computer Science paper by David Karger [1], which explained the algorithm.

Full implementation (Source Code) of Distributed Cache using `Consistent Hashing` algorithm you could find in [my Github repository](https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/ConsistentHashing).

<br>


## **Distributed Cache Architecture**

In our implementation, we will use [Partitioning](https://en.wikipedia.org/wiki/Partition_(database)) [2]. It is a technique that splits data among machines so that each machine is responsible for handling a subset of data. Particularly, we will use `Partitioning by Hash of Key` [3].


<br>

### **Request Routing**

The first decision about the partitioning strategy we should make - is to decide about Request Routing. 

Since we are using `Consistent Hashing`, the Request Routing Service should keep an up-to-date `Hashing Ring` based on which it will decide the correct node for the request.

There are 3 main approaches to request routing when we talk about `Partitioning` [4]:


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image13.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image13.png "image_tooltip"){:target="_blank"}


`1.` Node routing. In this approach, the Client sends a request to a random node. Each node knows about other nodes and will redirect the request to the necessary node.

I don’t prefer this approach, because then each node needs to keep Hashing Ring up-to-date. Any change in the cluster will end up in updating each node.

`2.` **<span style="text-decoration:underline;">Load balancer routing</span>**. In this approach, we have a few Load Balancers (otherwise it will be a single point of failure). The client calls any of our Load Balancers. They keep Hashing Ring and route the request to the particular node. 

It is expected to have not that many Load Balancers. Load balancers are stateless (to some point), meaning that new Load Balancers just need to call some other Load Balancer or Master and they can start serving data.

On top of that, it is better for us in terms of hashing ring updates, because, we even can do it synchronously by blocking the entire Load Balancer node, cause all clients can go to another Load Balancer meanwhile.

`3.` Client routing. In this approach, the client knows how to map the hash of the key to a particular node. It will not be easy to implement, because we would need the mechanism to notify the client about Hash Ring change. For that we need to implement consistent polling, or some push notifications mechanism.


<br>

### **High-Level Architecture**

According to [Software Architecture in Practice ](https://www.amazon.com/Software-Architecture-Practice-3rd-Engineering/dp/0321815734)book Our Component-and-connector [5] (in runtime) architecture looks like that:


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image2.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image2.png "image_tooltip"){:target="_blank"}


<br>

#### **How it is in MongoDb**

Our architecture is really similar to [MongoDb](https://www.mongodb.com/) architecture [6]:


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image16.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image16.png "image_tooltip"){:target="_blank"}


In our case `Shard = ChildNode, Mongos = Load Balancer, Config Server = Master Service`


<br>

#### **Client**

There might be multiple clients. They know only about `Load Balancers` and communicate only with them. `Clients` could be anything that can use HTTP protocol.


<br>

#### **Child Node**

Child Node is exactly one partition. In terms of Consistent Hashing, it is just one node placed into Hashing Ring that serves get/set functionality for distributed cache or partitioned database. Actually, it represents multiple partitions by Virtual Node approach But for simplicity think about it as a separate Partition.

Ideally, Child Node should know nothing about other components. In our case, it needs to let Master know it is overloaded to start rebalancing. It might be some message broker. I implemented it in a simpler way - Child Node just sends request to Master, and Master starts rebalancing straight away.


<br>

#### **Load Balancer**

For our functional requirements single `Load Balancer`  would be enough, although, this would be Single-Point-Of-Failure in that case. Therefore we keep multiple `Load Balancers` at the same time. `Load balancer` directs request from `Client` to `ChildNode`. Load Balancer knows about every `ChildNode`.

Keep in mind that this knowledge has `eventual consistency` property, so 2 different `Load Balancers` might have different knowledge about all `ChildNodes`, but eventually, this knowledge will be the same.


<br>

#### **Master**

Master knows about Child Nodes and Load Balancers. It is responsible for rebalancing, and managing all the Nodes, for example, it can spin a new Child Node or a new Load Balancer.

We have only a single Master in our Cluster. The reason is simple, we don’t want 2 Masters to start rebalancing the same node, because rebalancing is a long operation. Even though it is Single-Point-Of-Failure, we accept it. It is not critical for our functional requirements:  get/set operations (Load Balancer and Child Node are). It is essential for rebalancing, and it actually can wait to be fixed. 
 
It is possible to make it reliable by replication, but then we will end up implementing Consensus algorithm to promote some node to Master role in case of failures, or implementing another fancy algorithm to address consistency and concurrency issues.

Note, it seems that `in MongoDb Config Server (alternative of our Master) is Single-Point-Of-Failure for write operations` as well. [Here](https://www.mongodb.com/docs/manual/core/sharded-cluster-config-servers/#config-server-availability) it is explained [6]:

 

[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image14.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image14.png "image_tooltip"){:target="_blank"}
 
 


You can see, that in case Master Config Server (leader/primary) is lost, you also cannot do rebalancing in MongoDb. 
As I said, in such case you need to implement Leader Election algorithm which is pretty hard. 


<br>

## **Implementation**

All the source code you could find in [my GitHub repository](https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/ConsistentHashing).

Before we start digging into details, referencing [my previous article](https://andreyka26.com/consistent-hashing-pt1-theory#terminology--prerequisites), I need to put definitions.

We have 2 concepts: `Physical Node` and `Virtual Node`. 

`Physical Node` is supposed to be a different machine to leverage partitioning. Otherwise, if we put an additional Node to the same Server it will not give us any boost in memory or CPU. 

`Virtual Node` is the node that is used in Hashing Ring. There might be multiple Virtual Nodes on the same machine. It makes sense because sometimes one server is more powerful than another one. On top of that it is sometimes easier to move Virtual node between the Physical Nodes. Virtual Node gives you flexibility for the initial setup of your cluster. You might choose to set up 100 nodes on 5 servers. And then you might just spread Virtual Nodes to new Physical Node. Only after some time, you will end up splitting Virtual Nodes itself.

Our Distributed Cache will keep 1:1 mapping between `Physical Node` and `Virtual Node`, so 1 Physical Node (Child Node) must have 1 Virtual Node. It is done like that for demonstration purposes.

In my implementation, `Child Node` conceptually should be considered a `Physical Node`, and should be hosted as a single API on a single server. 

On top of that, we assume, that the key and value should be strings. If you need objects - use serialization. The key hash in our case is int32.


<br>

## **Common Services**

There are some common services, that are used by different Nodes in the cluster.


<br>

### **VirtualNode**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/NodeManagement/VirtualNode.cs)

`VirtualNode` is a class (actually record in .NET) that represents one Virtual Node that we are using in our Hashing Ring. It only has Position and MaxItems possible for that Virtual Node.

```cs
// we consider specific ring position of the virtual node as unique identifier
// meaning no 2 virtupal nodes can point to exactly same ring position (radian or degree)
public record VirtualNode(uint RingPosition, int MaxItemsCount);
```


<br>

### **PhysicalNode**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/NodeManagement/PhysicalNode.cs)

`PhysicalNode` represents a particular machine or server. In our case, it represents one instance of Child Node that could contain multiple Virtual Nodes, or one instance of Load Balancer.

```cs
public record PhysicalNode(Uri Location);
```

It only has Url to particular Child Node or Load Balancer instance.


<br>

### **IHashingRing**

[Source code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/HashingRing.cs)

`HashingRing` is the main service for Consistent Hashing. It manages nodes in the circle providing some useful API: adding nodes, removing nodes, and searching nodes by the key hash.

```cs
public class HashingRing : IHashingRing
{
    private readonly IHashService _hashService;
    private readonly SortedList<uint, VirtualNode> _virtualNodes = new SortedList<uint, VirtualNode>();

    public HashingRing(IHashService hashService)
    {
        _hashService = hashService;
    }

    public uint MaxValue => _hashService.MaxHashValue;

    //TODO thread safety if add/remove/get in parallel
    public void RemoveVirtualNode(uint nodePosition)
    {
        _virtualNodes.Remove(nodePosition);
    }

    //TODO thread safety if add/remove/get in parallel
    public void AddVirtualNode(VirtualNode virtualNode)
    {
        _virtualNodes.Add(virtualNode.RingPosition, virtualNode);
    }

    public VirtualNode GetVirtualNodeForHash(uint keyPosition)
    {
        var sortedNodePositions = _virtualNodes.Keys;
        var nodePosition = BinarySearchRightMostNode(sortedNodePositions, keyPosition);

        var node = _virtualNodes[nodePosition];
        return node;
    }

    public uint BinarySearchRightMostNode(IList<uint> nodePositions, uint keyPosition)
    {
        // in case keyPosition is bigger than MaxValue (if we consider to use real 360 degree circle or any other scale)
        // we should adjust it to max value of ring
        keyPosition = keyPosition % MaxValue;

        var start = 0;
        var end = nodePositions.Count - 1;

        while (start != end)
        {
            var mid = ((end - start) / 2) + start;

            if (keyPosition <= nodePositions[mid])
            {
                end = mid;
            }
            else
            {
                start = mid + 1;
            }
        }

        var nodePosition = nodePositions[start];

        // if your key is after node but before MaxHashValue - we return first node (because it is hash circle)
        if (keyPosition > nodePosition)
        {
            return nodePositions[0];
        }

        return nodePosition;
    }
}
```

We keep all the nodes in [SortedList](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedlist-2?view=net-7.0). As I understood from the source code it provides O (log N) complexity mostly. 

Canonically you would need Binary Search Tree here, which gives you O(log n) for adding, removing, and searching as well. To ensure complexity you might use some balanced trees, e.g. red-black tree.

And then we provide the necessary API using this tree or in our case SortedList.


<br>

### **IChildNodeManager**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/NodeManagement/ChildNodeManager.cs)

`ChildNodeManager` is responsible for mapping between Physical and Virtual Nodes. It is used by Master and Load Balancer for managing all Child Nodes and how a particular Virtual Node is mapped to Child Node and vice versa. On top of that, Hashing Ring manipulation happens through this service, because it aggregates Hashing Ring.

It has 2 dictionaries along with Hashing Ring.

```cs
private readonly Dictionary<VirtualNode, PhysicalNode> _virtualToPhysicalMapping = new Dictionary<VirtualNode, PhysicalNode>();

// uint is a ring position, we agreed that it is unique identifier of the virtual node.
private readonly Dictionary<PhysicalNode, Dictionary<uint, VirtualNode>> _physicalToVirtualMapping = new Dictionary<PhysicalNode, Dictionary<uint, VirtualNode>>();

private readonly IHashingRing _hashingRing;

public ChildNodeManager(IHashingRing hashingRing)
{
    _hashingRing = hashingRing;
}
```

This is sample method that adds Virtual Node to Physical Node (Child Node):

```cs
public void AddVirtualNode(VirtualNode virtualNode, PhysicalNode toPhysicalNode)
{
    _virtualToPhysicalMapping[virtualNode] = toPhysicalNode;

    if (!_physicalToVirtualMapping.ContainsKey(toPhysicalNode))
    {
        AddPhysicalNode(toPhysicalNode);
    }

    _physicalToVirtualMapping[toPhysicalNode][virtualNode.RingPosition] = virtualNode;
    _hashingRing.AddVirtualNode(virtualNode);
}

```


<br>

### **IPhysicalNodeProvider**

[Source code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/NodeManagement/PhysicalNodeProvider.cs)

`PhysicalNodeProvider` is responsible for spinning new Physical Nodes (Child Nodes) for rebalancing. Ideally, it should be responsible for getting down Physical Nodes as well, when we drop unnecessary nodes from the Hashing Ring.

The good approach here would be to dockerize all the Modules (Child Node, Load Balancer, Master), put them into one network, and use Kubernetes with Kubernetes .NET SDK that will start a new instance in the Kubernetes cluster. 
 
I think it would be possible, but it requires a lot of work - so let me know on social media if you are interested in it - we can do that.

Instead of that - I chose an easier but more hacky and bad approach: I am starting a new .NET process with a specific port, using built binaries on a local machine. I’m starting Load Balancer and Child Node that way. But this is only for demonstration purposes.

```cs

public async Task<PhysicalNode> CreateNewPhysicalNodeAsync(string assemblyPath, int? port = default, CancellationToken cancellationToken = default)
{
    if (!port.HasValue)
    {
        port = ++_currentAvailablePort;
    }
    else
    {
        if (_currentAvailablePort > port)
        {
            throw new ArgumentException($"Port should be monotonically increasing, set something above {_currentAvailablePort}");
        }
        _currentAvailablePort = port.Value + 1;
    }

    var url = $"https://localhost:{port}";
    var node = new PhysicalNode(new Uri(url));

    if (_processes.ContainsKey(node))
    {
        throw new ArgumentException($"this port is occupied already");
    }

    var args = $"--urls={url}";

    var process = new Process();
    process.StartInfo.FileName = assemblyPath;
    process.StartInfo.Arguments = args;

    process.Start();

    await Task.Delay(2 * 1000);

    _processes.Add(node, process);

    return node;
}
```

This is the method that creates a new .NET process that will listen to the specified port. We just get the assembly path and create a new Process with specific arguments.

For sure it is not a production code. A good approach should be Kubernetes based I think.


<br>

### **IReadWriteLockService**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/Concurrency/ReadWriteLockService.cs)

`ReadWriteLockService` is responsible for read-write locking. It is used in `ChildNodeService` that should add and remove cache values in a threaded manner keeping 2 data structures in sync (sorted list and dictionary). 
 
Internally it uses native [ReaderWriterLock](https://learn.microsoft.com/en-us/dotnet/api/system.threading.readerwriterlock?view=net-7.0). You could read about the guarantees and synchronization techniques it provides. What is important for me - is to allow multiple readers to read at the same time, and to allow exclusive lock for writing (meaning no other read/write operation is allowed while writing).

Note: as I know, this ReadWriteLock does not allow you to write async code (safely). But we don’t need it in our in-memory cache.


<br>

### **IAsyncSerializableLockService**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/Concurrency/AsyncSerializableLockService.cs)

`AsyncSerializableLockService` is a simple lock service that ensures 1 thread at a time is executing. It is implemented internally using [SemaphoreSlim ](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-7.0)with `WaitAsync` that allows you to write async code inside a locked area compared to `ReadWriteLockService`.


<br>

## **Child Node**


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image7.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image7.png "image_tooltip"){:target="_blank"}


`Child Node` is an HTTP service that is responsible for managing and handling one or more `Virtual Nodes` inside it. The instance of `Child Node` should be considered as `PhysicalNode`.


<br>

### **IChildNodeInMemoryCache (ThreadSafeChildNodeInMemoryCache)**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Common/Cache/ThreadSafeChildNodeInMemoryCache.cs)

`ThreadSafeChildNodeInMemoryCache` is responsible for one `Virtual Node’s` cache. It handles operations for a single Node on `Hashing Ring` and all items assigned to that Hashing Ring. On top of that, it has supportive methods for rebalancing.

```cs
private readonly VirtualNode _node;

private readonly Dictionary<uint, string> _cache = new Dictionary<uint, string>();
private readonly SortedList<uint, uint> _sortedInAscCacheHashes = new SortedList<uint, uint>();

private readonly IReadWriteLockService _lockService;
```

It keeps cache items in native Dictionary `_cache` and in SortedList `_sortedInAscCacheHashes`. We need a sorted list to be able to get the first half more easily and quickly when rebalancing. This service uses read-write lock service.

There are 2 types of methods in this service with the prefix `NotSafe` and without the prefix (Safe).

NotSafe methods do not use the read-write lock. Those without prefixes - do. They are needed because some of the methods call other methods, and then nested locking happens which we would like to avoid.

Method for adding item to the cache:

```cs
public bool AddToCache(uint keyHash, string value)
{
    var needRebalance = _lockService.Write(() => AddToCacheNotSafe(keyHash, value));

    return needRebalance;
}

public bool AddToCacheNotSafe(uint keyHash, string value)
{
    _cache[keyHash] = value;
    _sortedInAscCacheHashes[keyHash] = keyHash;

    if (GetCountOfItemsNotSafe() >= _node.MaxItemsCount)
    {
        return true;
    }

    return false;
}
```

Another interesting method is GetFirstHalfOfCache

```cs
public Dictionary<uint, string> GetFirstHalfOfCacheNotSafe(uint lastItemToRemoveInclusively)
{
    var halfCount = _cache.Count / 2;
    var firstHalf = _sortedInAscCacheHashes.Where(k => k.Key <= lastItemToRemoveInclusively).Take(halfCount).ToList();

    var tailDelta = halfCount - firstHalf.Count;

    if (tailDelta > 0)
    {
        //add from the tail
        var rest = _sortedInAscCacheHashes.Reverse().Take(tailDelta);

        firstHalf.AddRange(rest);
    }

    var halfDict = new Dictionary<uint, string>(halfCount);

    foreach (var keyHash in firstHalf)
    {
        halfDict.Add(keyHash.Key, _cache[keyHash.Key]);
    }

    return halfDict;
}
```

`lastItemToRemoveInclusively` - usually is just a Virtual Node position. It is different when we perform Rebalancing (see later in the article).

The tricky part of the method, is that we could have this situation. 

[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image1.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image1.png "image_tooltip"){:target="_blank"}
 
Consider the Orange node, the first part of it is 5/2 = first 2 elements, which are 20, 21 and not 3, 4. This is the edge case when we need to take some elements from the tail as well.


<br>

### **IChildNodeService**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.ChildNode/ChildNodeService.cs)

IChildNodeService is the singleton service that handles requests from the Controller. It is a singleton because we would like to keep our in-memory cache items and Virtual Nodes alive as the service is alive

```cs

private readonly Dictionary<uint, IChildNodeInMemoryCache> _nodeToCacheMapping =
    new Dictionary<uint, IChildNodeInMemoryCache>();

private readonly IRebalancingQueue _rebalancingQueue;
```

We keep `Virtual Nodes` in the dictionary as `ringPosition => ChildNodeInMemoryCache`. We ensure invariant that the Virtual Node position is unique across the Hashing Ring.

Rebalancing Queue is simply a Master Service client that will be called when some Virtual Node is overloaded. In theory, this should be some Messaging Queue Client that will send a rebalancing message to a queue, and then the Master picks up it and perform rebalancing.

All requests that are related to a particular Virtual Node’s cache are proxied to a particular ChildNodeInMemoryCache(ThreadSafeChildNodeInMemoryCache) depending on the request. 

 
For example, here is AddValue (by key) method.

```cs
public async Task<bool> AddValueAsync(uint nodePosition, uint keyHash, string value, CancellationToken cancellationToken)
{
    if (!_nodeToCacheMapping.ContainsKey(nodePosition))
    {
        throw new Exception($"there is no node for {nodePosition}, please add virtual node");
    }

    var doesNeedRebalancing = _nodeToCacheMapping[nodePosition].AddToCache(keyHash, value);

    if (doesNeedRebalancing)
    {
        await _rebalancingQueue.EmitNodeRebalancingAsync(_nodeToCacheMapping[nodePosition].Node, cancellationToken);
    }

    return doesNeedRebalancing;
}
```

The main functionality of this service is to keep and manage those Virtual Nodes.

```cs
public Task AddNodeAsync(VirtualNode node, CancellationToken cancellationToken)
{
    _nodeToCacheMapping.Add(node.RingPosition, new ThreadSafeChildNodeInMemoryCache(node, new ReadWriteLockService()));
    return Task.CompletedTask;
}

public Task RemoveNodeAsync(uint position, CancellationToken cancellationToken)
{
    _nodeToCacheMapping.Remove(position);
    return Task.CompletedTask;
}
```


<br>

## **Load Balancer**


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image15.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image15.png "image_tooltip"){:target="_blank"}


Load Balancer is an HTTP service that is responsible for managing `Hashing Ring` and directing requests from the Client to a particular `Child Node`. The instance of Load Balancer should be considered as PhysicalNode.


<br>

### **ILoadBalancerService**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.LoadBalancer/LoadBalancerService.cs)

This is the singleton service that handles requests from the Controller. It is a singleton because we would like to keep our in-memory Hashing Ring and Virtual Nodes alive as the service is alive.

It has `ChildNodeManager` (it is already described in `Common Services` section), IHashService to calculate the key hash for a particular key, and ChildNodeClient, which is just an Http client for ChildNode access.

`LoadBalancerService` has 2 responsibilities: 

`1.` Proxying requests to particular ChildNode

```cs
public async Task<string> GetValueAsync(string key, CancellationToken cancellationToken)
{

    var keyHash = _hashService.GetHash(key);

    var virtualNode = _nodeManager.GetVirtualNodeForHash(keyHash);
    var physicalNode = _nodeManager.ResolvePhysicalNode(virtualNode);

    var value = await _childNodeClient.GetFromCacheAsync(keyHash, virtualNode, physicalNode, cancellationToken);

    return value;
}
```

`2.` Handling updates to Hashing Ring.

```cs

public Task AddVirtualNodeAsync(string physicalNodeUrl, VirtualNode virtualNode, CancellationToken cancellationToken)
{
    var physicalNode = new PhysicalNode(new Uri(physicalNodeUrl));
    _nodeManager.AddVirtualNode(virtualNode, physicalNode);

    return Task.CompletedTask;
}
```


<br>

## **Master**


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image6.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image6.png "image_tooltip"){:target="_blank"}


Master is an HTTP service that is responsible for managing and handling Physical Nodes including Child Nodes and Load Balancers. It does rebalancing, and spinning new instances of physical nodes. The instance of Master should be considered as PhysicalNode.


<br>

### **IMasterService**

[Source Code](https://github.com/andreyka26-git/andreyka26-distributed-systems/blob/main/ConsistentHashing/src/DistributedCache.Master/MasterService.cs)

This is the singleton service that handles requests from the Controller. It is a singleton because we would like to keep our in-memory Hashing Ring and Virtual/Physical Nodes alive as the service is alive.

It has 2 clients: Child Node Client and Load Balancer Client, HashService to calculate ring position based on Url,  PhysicalNodeProvider, ChildNodeManager, and AsyncSerializableLockService (we already discussed it in `Common Services`).

We are performing all operations on master in a single-threaded manner so that no race conditions and inconsistencies can happen.

The most important method here is RebalanceNodeNotSafeAsync

```cs

public async Task RebalanceNodeNotSafeAsync(VirtualNode hotVirtualNode, CancellationToken cancellationToken)
{

    var hotPhysicalNode = _nodeManager.ResolvePhysicalNode(hotVirtualNode);
    var newPhysicalNode = await _physicalNodeProvider.CreateChildPhysicalNodeAsync(cancellationToken: cancellationToken);

    var firstHalf = await _childClient.GetFirstHalfOfCacheAsync(hotVirtualNode, hotPhysicalNode, cancellationToken);
    var nodePosition = firstHalf.OrderBy(h => h.Key).Last().Key;

    var newVirtualNode = new VirtualNode(nodePosition, hotVirtualNode.MaxItemsCount);

    _nodeManager.AddVirtualNode(newVirtualNode, newPhysicalNode);
    await _childClient.AddNewVirtualNodeAsync(newPhysicalNode, newVirtualNode, cancellationToken);

    // first add items that are already in the cache to the new node, before updating load balancers. So once we update load balancer
    // it is probable that Client will find the item in newly created node
    await _childClient.AddFirstHalfToNewNodeAsync(firstHalf, newVirtualNode, newPhysicalNode, cancellationToken);

    foreach (var loadBalancerNode in _physicalNodeProvider.LoadBalancers)
    {
        await _loadBalancerClient.AddVirtualNodeAsync(loadBalancerNode, newVirtualNode, newPhysicalNode, cancellationToken);
    }

    // in case new items are added while we are updating load balancers - we get the first half again to include newly added and not lose data
    // since middle point could be shifted because of new data, we will ignore all items that are greater than node's position on Child Node service,
    // at some point they will be expired
    // also, we don't overwrite duplicates, pretending the fresher data is on new Node, since Clients started writing there after updating load balancers
    var firstHalfAfterUpdating = await _childClient.GetFirstHalfOfCacheAsync(hotVirtualNode, hotPhysicalNode, cancellationToken);

    await _childClient.AddFirstHalfToNewNodeAsync(firstHalfAfterUpdating, newVirtualNode, newPhysicalNode, cancellationToken);
    await _childClient.RemoveFirstHalfOfCache(newVirtualNode.RingPosition, hotVirtualNode, hotPhysicalNode, cancellationToken);
}
```

Let’s visualize our system and how it will rebalance.

Assume we have `Master`, `Load Balancer`, and `Child Node`. `Child Node` has 1 Virtual Node with such key hashes (and some values, which are not important) [5, 7, 10, 12]. Let’s also assume that Max Count of items in Virtual Nodes is 5. 

Initial state: 


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image12.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image12.png "image_tooltip"){:target="_blank"}


We are adding 1 more key hash `3`. Now the count of items in `Child Node` is 5 and we need to rebalance. `Child Node` sends a request to `Master` to perform rebalancing.


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image3.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image3.png "image_tooltip"){:target="_blank"}


Then `Master` gets the first half from `Child Node1` for setting Hashing Ring position (last item in the first half), spins a new `Child Node (ChildNode2)`, and updates its own Hashing Ring and Node Manager.


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image10.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image10.png "image_tooltip"){:target="_blank"}


`Master` inserts Virtual Node to `ChildNode2` (Physical Node) so that it can accept new requests. Then `Master` adds the first half of cache items to `ChildNode2`, so all Clients can find the items in the new node. Then it updates all `Load Balancers`, setting `ChildNode2` to their Hashing Rings so that clients start using the new `Child Node (ChildNode2)`.


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image11.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image11.png "image_tooltip"){:target="_blank"}


Actually, this operation encountered a classical consistency problem in Distributed Systems. It has corner cases because the time, that lasts while we move the first half to the new `Child Node2` and update all the `Load Balancers` is not small, on top of that, we don’t have atomic transactions here. During that time some Clients can write data to `ChildNode1` and then try to read it in `ChildNode2` (after `Load Balancers` update)  where does not exist.

One good approach is the approach used in Master-Leader database Replication that Martin Kleppmann described in his book [7]. The idea is simple, we take a snapshot and create a snapshot point. After we transferred the first half (our snapshot), we just transfer every data after the snapshot point until we are in sync. But it is too much for our demo. 


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image5.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image5.png "image_tooltip"){:target="_blank"}


Instead of this, after updating `Load Balancers` we just query the first half once more and write it to `ChildNode2` once more. 

On `Child Node` we drop all duplicates (old items), and ignore all items that have a greater key hash than the ring position of Virtual Node where we transfer to because the middle point most probably will be shifted if we add new items.

This way we will not lose data that was written before we finished updating all `Load Balancers` and after we moved the first half to `ChildNode2`. 

Then we just remove the first half from `ChildNode1` starting from the lowest key hash up until `ChildNode2’s` position inclusively.

Another topic is retry and failover, what to do if one Load Balancer goes down, or any of 2 nodes become unresponsive - but it is not a topic for this article.

I am not sure it is the correct approach, so feedback is welcomed on my social media (`About` section) I will correct the algorithm.


<br>

## **DEMO**


<br>

### **Presetup**

For demo purposes, I have added Informational endpoints to show what data is actually in all Nodes, for example, Endpoint on Master Node: 
 
```cs
public async Task<ClusterInformationModel> GetClusterInformationAsync(CancellationToken cancellationToken)
{
    var clusterInformation = new ClusterInformationModel();

    foreach(var loadBalancer in _physicalNodeProvider.LoadBalancers)
    {
        var loadBalancerInformationModel = await _loadBalancerClient.GetLoadBalancerInformationModelAsync(loadBalancer, cancellationToken);

        clusterInformation.LoadBalancerInformations.Add(new ClusterInformationModelItem
        {
            LoadBalancerInfo = loadBalancerInformationModel,
            PhysicalNode = loadBalancer
        });
    }

    return clusterInformation;
} 
```

It will go through each Load Balancer and grab info that each Load Balancer has. Load Balancer in Turn will query all the Child Nodes it knows about and aggregate this info for Master request.

On top of that, we pre-setup our cluster from the Master node, on Startup:

```cs

async Task InitializeMasterAsync()
{
    using (var scope = app.Services.CreateScope())
    {

        var masterService = scope.ServiceProvider.GetRequiredService<IMasterService>();

        // order matters

        await masterService.CreateLoadBalancerAsync(7005, CancellationToken.None);
        await masterService.CreateLoadBalancerAsync(7006, CancellationToken.None);

        await masterService.CreateNewChildNodeAsync(7007, CancellationToken.None);
        await masterService.CreateNewChildNodeAsync(7008, CancellationToken.None);
    }
}
```

It is simple, we are creating 2 Load Balancers and 2 Child Nodes in our cluster. The default Max count of items per Child Node is 5.


<br>

### **Rebalancing showcase**

Run the application, and it will spin 5 http services: 
 
Master: [https://localhost:7001/swagger/index.html](https://localhost:7001/swagger/index.html) 

Load Balancer1: [https://localhost:7005/swagger/index.html](https://localhost:7005/swagger/index.html)

Load Balancer2: [https://localhost:7006/swagger/index.html](https://localhost:7006/swagger/index.html)

Child Node1: [https://localhost:7007/swagger/index.html](https://localhost:7007/swagger/index.html)

Child Node2: [https://localhost:7008/swagger/index.html](https://localhost:7008/swagger/index.html)

`1.` Let’s query Cluster Information after everything is up


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image4.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image4.png "image_tooltip"){:target="_blank"}


On the screen,  you can see Load Balancer1’s snapshot. It has 2 child nodes on 3147170649 and 1017285212 position

`2.` Add 4 elements through Load Balancer API. 

I’m adding this for demo purposes in this way:

`1 => 1`, `2 => 2`, `3 => 3` …

After 4th added element, you might get lucky and add your value as 5th element that will trigger rebalancing.

I have added 6 elements, and I have this distribution of items 
 

[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image9.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image9.png "image_tooltip"){:target="_blank"}


`3.` Put one more item that will trigger rebalancing

I put “7”: “7”, and I noticed that the execution time was about 1-2 seconds.

If you query Cluster Information (on Master level, or Load Balancer level) you will see, that there is new Child Node added on port `7010` 
 
```json
{
  "childInformationModels": [
    {
      "physicalNode": {
        "location": "https://localhost:7007/"
      },
      "childInfo": {
        "virtualNodesWithItems": [
          {
            "node": {
              "ringPosition": 3147170649,
              "maxItemsCount": 5
            },
            "cacheItems": {
              "2108632412": "7",
              "2582341876": "6",
              "2969606722": "5"
            }
          }
        ]
      }
    },
    {
      "physicalNode": {
        "location": "https://localhost:7008/"
      },
      "childInfo": {
        "virtualNodesWithItems": [
          {
            "node": {
              "ringPosition": 1017285212,
              "maxItemsCount": 5
            },
            "cacheItems": {
              "288247112": "1",
              "733514300": "4"
            }
          }
        ]
      }
    },
    {
      "physicalNode": {
        "location": "https://localhost:7010/"
      },
      "childInfo": {
        "virtualNodesWithItems": [
          {
            "node": {
              "ringPosition": 1192688440,
              "maxItemsCount": 5
            },
            "cacheItems": {
              "1137439682": "2",
              "1192688440": "3"
            }
          }
        ]
      }
    }
  ]
}
```

You can open the swagger of the newly created node and check that it really contains those items that were added by rebalancing. 


[![alt_text](/assets/2023-05-28-consistent-hashing-pt2-implementation/image8.png "image_tooltip")](/assets/2023-05-28-consistent-hashing-pt2-implementation/image8.png "image_tooltip"){:target="_blank"}


You can see that when rebalancing the lowest 2 hashes were taken.

Indeed, while using Consistent Hashing, only O (n / m) items are moved between the nodes where n is the count of all items, and m is the count of all nodes. We had 2 nodes handling 6 items, 6 / 2 = 3. Actually, we moved only 2 items.


<br>

## **Summary**

In this article we `implemented Distributed Cache` with all internals explained using `Consistent Hashing` algorithm. It is really simplified version and it does not cover a lot of corner cases. There is a reason why a really big team working on Redis for years, and still keep working on it. But we implemented the algorithm itself. We have partitioning and automatic rebalancing using the `Consistent Hashing` algorithm.

Please feel free to leave feedback - I will correct the mistakes that you mentioned.

 
And separate thanks for reviewing to my friends: [Oleh](https://www.linkedin.com/in/o%CE%BBeh-kyshkevych-84a029205/) and [Mykola](https://www.linkedin.com/in/mykola-zaiarnyi-71433316b/)

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://symptom-diary.com](https://symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)

<br>

## **References**

[1] David Karger, Eric Lehman, Tom Leighton, Matthew Levine, Daniel Lewin, Rina Panigrahy: “Consistent hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web”,  4 paragraph, 1997

[2] Wikipedia: Partition, [https://en.wikipedia.org/wiki/Partition_(database)](https://en.wikipedia.org/wiki/Partition_(database)) 

[3] Martin Kleppmann: “Designing Data-Intensive Applications”, page 203, March 2017

[4] Martin Kleppmann: “Designing Data-Intensive Applications”, page 214, March 2017

[5] Rick Kazman, Paul Clements, Len Bass: Software Architecture in Practice, page 5, 2013

[6] MongoDB official documentation: [https://www.mongodb.com/docs/manual/core/sharded-cluster-components/](https://www.mongodb.com/docs/manual/core/sharded-cluster-components/) 

[7] Martin Kleppmann: “Designing Data-Intensive Applications”, page 155, March 2017