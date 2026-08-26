import { faker } from '@faker-js/faker';

export function generateMockValue(fieldName) {
  const key = fieldName.toLowerCase();

  if (key === 'id' || key.endsWith('id')) return faker.string.uuid();
  if (key.includes('email')) return faker.internet.email();
  if (key.includes('password')) return faker.internet.password();
  if (key.includes('username')) return faker.internet.userName();
  if (key.includes('firstname')) return faker.person.firstName();
  if (key.includes('lastname')) return faker.person.lastName();
  if (key === 'name' || key.includes('fullname')) return faker.person.fullName();
  if (key.includes('phone')) return faker.phone.number();
  if (key.includes('address')) return faker.location.streetAddress();
  if (key.includes('city')) return faker.location.city();
  if (key.includes('country')) return faker.location.country();
  if (key.includes('zip') || key.includes('postal')) return faker.location.zipCode();
  if (key.includes('url') || key.includes('link') || key.includes('avatar') || key.includes('image')) {
    return faker.internet.url();
  }
  if (key.includes('date') || key.endsWith('at') || key === 'dob' || key.includes('birthday')) {
    return faker.date.recent().toISOString();
  }
  if (key.includes('price') || key.includes('amount') || key.includes('cost') || key.includes('total')) {
    return Number(faker.commerce.price());
  }
  if (key.includes('count') || key.includes('quantity') || key.includes('age')) {
    return faker.number.int({ min: 1, max: 100 });
  }
  if (key.startsWith('is') || key.startsWith('has') || key.includes('active') || key.includes('enabled')) {
    return faker.datatype.boolean();
  }
  if (key.includes('description') || key.includes('bio') || key.includes('message') || key.includes('comment')) {
    return faker.lorem.sentence();
  }
  if (key.includes('title')) return faker.lorem.words(3);
  if (key.includes('tag')) return [faker.word.sample(), faker.word.sample()];

  return faker.word.words(2); // generic fallback
}

export function generateMockBody(fields) {
  const mock = {};
  for (const field of fields) {
    mock[field] = generateMockValue(field);
  }
  return mock;
}