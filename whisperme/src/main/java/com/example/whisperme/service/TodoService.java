package com.example.whisperme.service;

import com.example.whisperme.domain.Todo;
import com.example.whisperme.mapper.TodoMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class TodoService {

    private final TodoMapper todoMapper;

    public TodoService(TodoMapper todoMapper) {
        this.todoMapper = todoMapper;
    }

    public List<Todo> findToday(Long memberId) {
        return todoMapper.findToday(memberId);
    }

    public List<Todo> findFuture(Long memberId) {
        return todoMapper.findFuture(memberId);
    }

    public List<Todo> findPast(Long memberId) {
        return todoMapper.findPast(memberId);
    }

    public void addTodo(Todo todo) {

        if (todo.getMemberId() == null) {
            todo.setMemberId(1L);
        }

        if (todo.getTodoDate() == null) {
            todo.setTodoDate(LocalDate.now());
        }

        todo.setDone(false);
        todoMapper.insertTodo(todo);
    }

    public void doneTodo(Long id) {
        todoMapper.updateDone(id);
    }

    public void deleteTodo(Long id) {
        todoMapper.deleteTodo(id);
    }
}