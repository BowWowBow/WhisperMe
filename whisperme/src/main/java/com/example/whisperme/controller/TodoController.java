package com.example.whisperme.controller;

import com.example.whisperme.domain.Todo;
import com.example.whisperme.service.TodoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
@CrossOrigin(origins = "http://localhost:5173")
public class TodoController {

    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping("/{memberId}/today")
    public List<Todo> today(@PathVariable Long memberId) {
        return todoService.findToday(memberId);
    }

    @GetMapping("/{memberId}/future")
    public List<Todo> future(@PathVariable Long memberId) {
        return todoService.findFuture(memberId);
    }

    @GetMapping("/{memberId}/past")
    public List<Todo> past(@PathVariable Long memberId) {
        return todoService.findPast(memberId);
    }

    @PostMapping
    public void add(@RequestBody Todo todo) {
        todoService.addTodo(todo);
    }

    @PutMapping("/{id}/done")
    public void done(@PathVariable Long id) {
        todoService.doneTodo(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        todoService.deleteTodo(id);
    }
}