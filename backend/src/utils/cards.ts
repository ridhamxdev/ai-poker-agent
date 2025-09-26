import { Card } from '../types';

export const createDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

export const dealCards = (deck: Card[], numCards: number): { cards: Card[]; remainingDeck: Card[] } => {
  if (deck.length < numCards) {
    throw new Error('Not enough cards in deck');
  }
  
  const cards = deck.slice(0, numCards);
  const remainingDeck = deck.slice(numCards);
  
  return { cards, remainingDeck };
};

export const getCardValue = (rank: Card['rank']): number => {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(rank);
  }
};

export const cardToString = (card: Card): string => {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  
  return `${card.rank}${suitSymbols[card.suit]}`;
};

export const cardsToString = (cards: Card[]): string => {
  return cards.map(cardToString).join(' ');
};
