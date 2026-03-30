"use client";

import { Alert, Spinner, Stack, Text } from "@chakra-ui/react";

export function PageLoadingState({ label }: { label: string }) {
  return (
    <Stack align="center" justify="center" minH="280px" gap="4">
      <Spinner size="xl" />
      <Text>{label}</Text>
    </Stack>
  );
}

export function PageErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Alert.Root status="error" rounded="2xl">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

