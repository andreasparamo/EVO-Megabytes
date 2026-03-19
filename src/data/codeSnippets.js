export const CODE_SNIPPETS = {
  c: [
    {
      id: "c-001",
      code: '#include <stdio.h>\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
      difficulty: "easy",
      description: "Hello World in C",
    },
    {
      id: "c-002",
      code: "int sum = 0;\nfor(int i = 0; i < 10; i++) {\n    sum += i;\n}",
      difficulty: "easy",
      description: "For loop in C",
    },
    {
      id: "c-003",
      code: "int factorial(int n) {\n    if(n <= 1) return 1;\n    return n * factorial(n - 1);\n}",
      difficulty: "medium",
      description: "Recursive factorial",
    },
  ],
  cpp: [
    {
      id: "cpp-001",
      code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}',
      difficulty: "easy",
      description: "Hello World in C++",
    },
  ],
  csharp: [
    {
      id: "cs-001",
      code: 'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World");\n    }\n}',
      difficulty: "easy",
      description: "Hello World in C#",
    },
  ],
  python: [
    {
      id: "py-001",
      code: 'def greet(name):\n    return f"Hello, {name}!"\n\nfor i in range(5):\n    print(greet(f"User {i}"))',
      difficulty: "easy",
      description: "Greeting loop in Python",
    },
  ],
  java: [
    {
      id: "java-001",
      code: 'public class Main {\n    public static void main(String[] args) {\n        for (int i = 0; i < 5; i++) {\n            System.out.println("Count: " + i);\n        }\n    }\n}',
      difficulty: "easy",
      description: "For loop in Java",
    },
  ],
  javascript: [
    {
      id: "js-001",
      code: 'const nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);\nconsole.log(doubled);',
      difficulty: "easy",
      description: "Array map in JavaScript",
    },
  ],
  typescript: [
    {
      id: "ts-001",
      code: 'interface User {\n    name: string;\n    age: number;\n}\n\nfunction greet(user: User): string {\n    return `Hello, ${user.name}`;\n}',
      difficulty: "easy",
      description: "Interface in TypeScript",
    },
  ],
  go: [
    {
      id: "go-001",
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n    for i := 0; i < 5; i++ {\n        fmt.Println("Count:", i)\n    }\n}',
      difficulty: "easy",
      description: "For loop in Go",
    },
  ],
  rust: [
    {
      id: "rs-001",
      code: 'fn main() {\n    let nums = vec![1, 2, 3, 4, 5];\n    for n in &nums {\n        println!("{}", n);\n    }\n}',
      difficulty: "easy",
      description: "Vector loop in Rust",
    },
  ],
  sql: [
    {
      id: "sql-001",
      code: "SELECT users.name, orders.total\nFROM users\nINNER JOIN orders ON users.id = orders.user_id\nWHERE orders.total > 100\nORDER BY orders.total DESC;",
      difficulty: "medium",
      description: "JOIN with filter in SQL",
    },
  ],
};

// Get random snippet from a language
export function getRandomSnippet(language = "c") {
  const snippets = CODE_SNIPPETS[language] || CODE_SNIPPETS.c;
  return snippets[Math.floor(Math.random() * snippets.length)];
}

// Get all available languages
export function getAllLanguages() {
  return Object.keys(CODE_SNIPPETS);
}

// Get snippet by difficulty
export function getSnippetByDifficulty(language, difficulty) {
  const snippets = CODE_SNIPPETS[language] || CODE_SNIPPETS.c;
  const filtered = snippets.filter((s) => s.difficulty === difficulty);
  return (
    filtered[Math.floor(Math.random() * filtered.length)] ||
    getRandomSnippet(language)
  );
}
