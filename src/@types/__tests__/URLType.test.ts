const expectType = <T>(value: T) => value;

expectType<URLType>('http://example.com');
expectType<URLType>('https://example.com/news');
// @ts-expect-error give non URL
expectType<URLType>('example.com/news');
