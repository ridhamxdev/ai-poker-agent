import { Card, Hand } from '../types';
import { getCardValue } from './cards';

export const evaluateHand = (cards: Card[]): Hand => {
  if (cards.length < 5) {
    throw new Error('Hand must contain at least 5 cards');
  }

  // Get best 5-card combination from 7 cards
  const bestHand = getBestFiveCardHand(cards);
  return bestHand;
};

const getBestFiveCardHand = (cards: Card[]): Hand => {
  const allCombinations = getCombinations(cards, 5);
  let bestHand: Hand | null = null;

  for (const combination of allCombinations) {
    const hand = evaluateFiveCardHand(combination);
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand!;
};

const getCombinations = (arr: Card[], size: number): Card[][] => {
  if (size > arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(card => [card]);

  const combinations: Card[][] = [];
  
  for (let i = 0; i <= arr.length - size; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), size - 1);
    
    for (const tail of tailCombinations) {
      combinations.push([head, ...tail]);
    }
  }
  
  return combinations;
};

const evaluateFiveCardHand = (cards: Card[]): Hand => {
  const sortedCards = [...cards].sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));
  
  // Check for flush
  const isFlush = cards.every(card => card.suit === cards[0].suit);
  
  // Check for straight
  const values = sortedCards.map(card => getCardValue(card.rank));
  const isStraight = isConsecutive(values) || isWheelStraight(values);
  
  // Count ranks
  const rankCounts = new Map<string, number>();
  cards.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  
  // Determine hand type
  if (isStraight && isFlush) {
    if (values[0] === 14 && values[1] === 13) {
      return { cards: sortedCards, rank: 1, name: 'Royal Flush', highCard: sortedCards[0] };
    }
    return { cards: sortedCards, rank: 2, name: 'Straight Flush', highCard: sortedCards[0] };
  }
  
  if (counts[0] === 4) {
    return { cards: sortedCards, rank: 3, name: 'Four of a Kind', highCard: sortedCards[0] };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    return { cards: sortedCards, rank: 4, name: 'Full House', highCard: sortedCards[0] };
  }
  
  if (isFlush) {
    return { cards: sortedCards, rank: 5, name: 'Flush', highCard: sortedCards[0] };
  }
  
  if (isStraight) {
    return { cards: sortedCards, rank: 6, name: 'Straight', highCard: sortedCards[0] };
  }
  
  if (counts[0] === 3) {
    return { cards: sortedCards, rank: 7, name: 'Three of a Kind', highCard: sortedCards[0] };
  }
  
  if (counts[0] === 2 && counts[1] === 2) {
    return { cards: sortedCards, rank: 8, name: 'Two Pair', highCard: sortedCards[0] };
  }
  
  if (counts[0] === 2) {
    return { cards: sortedCards, rank: 9, name: 'One Pair', highCard: sortedCards[0] };
  }
  
  return { cards: sortedCards, rank: 10, name: 'High Card', highCard: sortedCards[0] };
};

const isConsecutive = (values: number[]): boolean => {
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      return false;
    }
  }
  return true;
};

const isWheelStraight = (values: number[]): boolean => {
  // A-2-3-4-5 straight (wheel)
  const wheel = [14, 5, 4, 3, 2];
  return JSON.stringify(values.sort((a, b) => b - a)) === JSON.stringify(wheel);
};

export const compareHands = (hand1: Hand, hand2: Hand): number => {
  // Lower rank number = better hand
  if (hand1.rank !== hand2.rank) {
    return hand2.rank - hand1.rank;
  }
  
  // Same hand type, compare by high cards
  for (let i = 0; i < hand1.cards.length; i++) {
    const value1 = getCardValue(hand1.cards[i].rank);
    const value2 = getCardValue(hand2.cards[i].rank);
    
    if (value1 !== value2) {
      return value1 - value2;
    }
  }
  
  return 0; // Tie
};

export const getHandStrength = (hand: Hand): number => {
  // Return hand strength as a value between 0 and 1
  const maxRank = 10;
  return (maxRank - hand.rank) / maxRank;
};
