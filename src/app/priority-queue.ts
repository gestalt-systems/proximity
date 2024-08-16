type QueueNode<T> = { item: T; next: QueueNode<T> | null }

export class PriorityQueue<T> {
	private readonly queues: Array<{
		head: QueueNode<T> | null
		tail: QueueNode<T> | null
	}>

	constructor(ranks: number) {
		// one queue for each integer priority level
		this.queues = Array.from({ length: ranks }, () => ({
			head: null,
			tail: null,
		}))
	}

	/**
	 * Indicate if the queue is empty.
	 * @returns {boolean} true if empty, false otherwise.
	 */
	isEmpty(): boolean {
		return this.queues.every((list) => !list.head)
	}

	/**
	 * Clear the queue, removing all items.
	 */
	clear(): void {
		this.queues.forEach((queue) => {
			queue.head = null
			queue.tail = null
		})
	}

	/**
	 * Insert an item into the queue with a given priority rank.
	 * @param {T} item The item to add.
	 * @param {number} rank The integer priority rank.
	 *  Priority ranks are integers starting at zero.
	 *  Lower ranks indicate higher priority.
	 */
	enqueue(item: T, rank: number): void {
		const queue = this.queues[rank]
		if (!queue) {
			throw new Error(`Invalid queue priority rank: ${rank}`)
		}

		const queued: QueueNode<T> = { item, next: null }
		if (queue.head === null) {
			queue.head = queue.tail = queued
		} else {
			queue.tail!.next = queued
			queue.tail = queued
		}
	}

	/**
	 * Peek at the next highest priority item without removing it.
	 * @returns {T | undefined} The next item in the queue,
	 *  or undefined if this queue is empty.
	 */
	peek(): T | undefined {
		for (const list of this.queues) {
			const { head } = list
			if (head !== null) return head.item
		}
	}

	/**
	 * Remove a set of items from the queue, regardless of priority rank.
	 * If a provided item is not in the queue it will be ignored.
	 * @param {(item: T) => boolean} test A predicate function to test
	 * 	if an item should be removed (true to drop, false to keep).
	 */
	remove(test: (item: T) => boolean): void {
		for (const list of this.queues) {
			let { head, tail } = list
			for (
				let prev: QueueNode<T> | null = null, curr = head;
				curr;
				prev = curr, curr = curr.next
			) {
				if (test(curr.item)) {
					if (curr === head) head = curr.next
					else prev!.next = curr.next

					if (curr === tail) tail = prev || head
				}
			}
			list.head = head
			list.tail = tail
		}
	}

	/**
	 * Remove and return the next highest priority item.
	 * @returns {T | undefined} The next item in the queue,
	 *  or undefined if this queue is empty.
	 */
	dequeue(): T | undefined {
		for (const list of this.queues) {
			const { head } = list
			if (head !== null) {
				list.head = head.next
				if (list.tail === head) list.tail = null

				return head.item
			}
		}
	}
}
