export async function createRepository(token, repositoryData, memberEmails = []) {
  const response = await fetch("/api/repositories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: repositoryData.name,
      description: repositoryData.description,
      domain: repositoryData.domain,
      researchType: repositoryData.type || repositoryData.researchType,
      privacy: repositoryData.privacy,
      memberEmails,
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to create this repository.");
  }

  return result;
}
