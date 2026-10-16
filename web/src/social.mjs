export const socialKey = communityId => `adesso-community-chat:${communityId}:v1`;

export function participantsFor(community) {
  const people = [];
  if (community.owner) people.push({
    id: `${community.id}-owner`,
    name: `${community.owner.firstName} ${community.owner.lastName}`,
    role: 'producer',
    registered: true,
    detail: `${community.plant.type} · ${community.plant.capacity} kW`,
  });
  community.households.forEach((household, index) => people.push({
    id: `${community.id}-h${index + 1}`,
    name: `Haushalt ${index + 1}`,
    role: 'consumer',
    registered: Boolean(household.participates),
    detail: household.participates ? 'Kann Community-Strom beziehen' : 'Nicht für MK7 registriert',
  }));
  return people;
}

export function threadId(communityId, first, second) {
  return `${communityId}:${[first, second].sort().join(':')}`;
}

export function parseSocial(raw) {
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || !Array.isArray(value.threads)) return {threads: []};
    return {threads: value.threads.filter(thread => thread && typeof thread.id === 'string').map(thread => ({
      ...thread,
      memberIds: Array.isArray(thread.memberIds) ? thread.memberIds.filter(id => typeof id === 'string') : [],
      memberNames: thread.memberNames && typeof thread.memberNames === 'object' ? thread.memberNames : {},
      messages: Array.isArray(thread.messages) ? thread.messages.filter(message => message && typeof message.senderId === 'string').map(message => ({
        ...message,
        id: String(message.id || `${message.sentAt || ''}-${message.senderId}`),
        text: String(message.text || ''),
        sentAt: String(message.sentAt || new Date(0).toISOString()),
        readBy: Array.isArray(message.readBy) ? message.readBy : [],
      })) : [],
    }))};
  } catch {
    return {threads: []};
  }
}

export function unreadCount(store, userId) {
  return parseSocial(JSON.stringify(store)).threads.reduce((total, thread) => total + thread.messages.filter(message => message.senderId !== userId && !message.readBy.includes(userId)).length, 0);
}

export function upsertMessage(store, communityId, from, to, text, now = new Date().toISOString()) {
  const clean = String(text || '').trim().slice(0, 1000);
  if (!clean) return store;
  const id = threadId(communityId, from.id, to.id);
  const threads = parseSocial(JSON.stringify(store)).threads.map(thread => ({...thread, messages: [...thread.messages]}));
  let thread = threads.find(item => item.id === id);
  if (!thread) {
    thread = {id, communityId, memberIds: [from.id, to.id], memberNames: {[from.id]: from.name, [to.id]: to.name}, messages: []};
    threads.push(thread);
  }
  thread.memberNames = {...thread.memberNames, [from.id]: from.name, [to.id]: to.name};
  thread.messages.push({id: `${now}-${from.id}-${thread.messages.length}`, senderId: from.id, text: clean, sentAt: now, readBy: [from.id]});
  return {threads};
}

export function markThreadRead(store, id, userId) {
  return {threads: parseSocial(JSON.stringify(store)).threads.map(thread => thread.id !== id ? thread : ({...thread, messages: thread.messages.map(message => message.senderId === userId || message.readBy.includes(userId) ? message : ({...message, readBy: [...message.readBy, userId]}))}))};
}
