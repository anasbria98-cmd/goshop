import test from 'node:test';
import assert from 'node:assert/strict';
import { helpQuestions, helpTopicAnswer, answerHelpQuestion } from '../data/assistant-faq.ts';
import { information } from '../data/information.ts';

test('Prepared help covers store questions in French and Arabic with the same topics and working route shapes', () => {
  const french = helpQuestions('fr');
  const arabic = helpQuestions('ar');
  assert.deepEqual(french.map(q => q.id), arabic.map(q => q.id));
  assert.equal(new Set(french.map(q => q.id)).size, french.length);
  for (const locale of ['fr', 'ar']) {
    for (const question of helpQuestions(locale)) {
      const reply = helpTopicAnswer(question.id, locale);
      assert.ok(question.label.length > 0);
      assert.ok(reply.text.length > 30);
      assert.ok(reply.links.length > 0);
      assert.deepEqual(answerHelpQuestion(question.label, locale), reply);
      for (const link of reply.links) {
        assert.ok(link.label.length > 0);
        if (link.href.startsWith('/informations/')) assert.ok(information[link.href.slice('/informations/'.length)]);
        else assert.ok(['/recherche', '/compte', 'https://wa.me/212644535251', 'tel:+212522900590'].includes(link.href));
      }
    }
  }
});

test('Specific typed requests select the relevant prepared answer instead of generic product help', () => {
  const examples = [
    ['Quel est le prix de ce produit ?', 'prices', 'fr'],
    ['Est-ce que ce produit est en stock ?', 'stock', 'fr'],
    ['Comment suivre ma commande ?', 'orders', 'fr'],
    ['Un retour pour ma commande', 'returns', 'fr'],
    ['Le paiement de ma commande', 'payment', 'fr'],
    ['Livraison de mon produit à Rabat', 'delivery', 'fr'],
    ['Choisir une couleur pour mon produit', 'colors', 'fr'],
    ['Vos horaires de retrait ?', 'pickup', 'fr'],
    ['Un conseil pour mon installation électrique', 'advice', 'fr'],
    ['Je cherche un produit', 'products', 'fr'],
    ['Je veux vous contacter', 'contact', 'fr'],
    ['ما سعر هذا المنتج؟', 'prices', 'ar'],
    ['هل يوجد توصيل؟', 'delivery', 'ar'],
    ['كيف أتتبع طلبي؟', 'orders', 'ar'],
  ];
  for (const [text, id, locale] of examples) assert.deepEqual(answerHelpQuestion(text, locale), helpTopicAnswer(id, locale), text);
});

test('Prepared policies preserve the existing store guidance without invented commercial promises', () => {
  assert.ok(helpTopicAnswer('delivery', 'fr').text.includes('Les frais et le délai applicables sont confirmés avant expédition.'));
  assert.equal(helpTopicAnswer('returns', 'fr').text, information.retours.body.join(' '));
  assert.ok(helpTopicAnswer('payment', 'fr').text.includes('mode de paiement doit être confirmé'));
  assert.ok(helpTopicAnswer('orders', 'fr').text.includes('ne consulte pas vos commandes personnelles'));
  for (const id of ['delivery', 'prices', 'stock', 'payment', 'returns', 'pickup']) assert.doesNotMatch(helpTopicAnswer(id, 'fr').text, /\d/);
});

test('Unknown questions stay honest and offer an encoded catalogue search or real human support', () => {
  const question = '<script>alert(1)</script> & q=javascript:evil';
  for (const locale of ['fr', 'ar']) {
    const reply = answerHelpQuestion(question, locale);
    const url = new URL(reply.links[0].href, 'https://www.goelec.ma');
    assert.equal(url.origin, 'https://www.goelec.ma');
    assert.equal(url.pathname, '/recherche');
    assert.equal(url.searchParams.get('q'), question);
    assert.equal(reply.links[1].href, 'https://wa.me/212644535251');
    assert.ok(!reply.text.includes(question));
    assert.deepEqual(answerHelpQuestion(question, locale), reply);
  }
  assert.equal(helpTopicAnswer('unknown-topic', 'fr').links[0].href, '/recherche');
  assert.equal(new URL(answerHelpQuestion('z'.repeat(800), 'fr').links[0].href, 'https://www.goelec.ma').searchParams.get('q').length, 500);
});
